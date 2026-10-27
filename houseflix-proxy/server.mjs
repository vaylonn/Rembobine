// Proxy HouseFlix : tourne sur le Pi, à côté de Radarr, Sonarr et Jellyfin.
// Il garde les clés API et n'expose à Rembobine que quelques routes, protégées
// par un jeton signé (HS256) que Rembobine délivre après connexion.
// Aucune dépendance : Node 22 suffit.

import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Readable } from "node:stream";

const env = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") throw new Error(`${name} n'est pas défini.`);
  return value;
};

const PORT = Number(process.env.PORT ?? 8787);
const SECRET = env("HOUSEFLIX_SECRET");
if (SECRET.length < 32) throw new Error("HOUSEFLIX_SECRET doit faire au moins 32 caractères.");
// Origines autorisées (CORS), séparées par des virgules : l'URL de Rembobine.
const ORIGINS = new Set(env("ALLOWED_ORIGINS").split(",").map((o) => o.trim().replace(/\/$/, "")));

const RADARR = { url: env("RADARR_URL", "http://radarr:7878"), key: env("RADARR_API_KEY") };
const SONARR = { url: env("SONARR_URL", "http://sonarr:8989"), key: env("SONARR_API_KEY") };
const JELLYFIN = { url: env("JELLYFIN_URL", "http://jellyfin:8096"), key: env("JELLYFIN_API_KEY") };
// Adresse de Jellyfin vue depuis tes appareils (lien « Ouvrir dans Jellyfin »).
const JELLYFIN_PUBLIC_URL = process.env.JELLYFIN_PUBLIC_URL?.replace(/\/$/, "") || null;

// --- Jeton ------------------------------------------------------------------

function verifyToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", SECRET).update(`${header}.${payload}`).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    if (JSON.parse(Buffer.from(header, "base64url").toString()).alg !== "HS256") return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (claims.aud !== "houseflix") return null;
    if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

// --- Appels aux services ----------------------------------------------------

class UpstreamError extends Error {}

async function arr(service, path, init = {}) {
  const res = await fetch(service.url + path, {
    ...init,
    headers: { "X-Api-Key": service.key, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new UpstreamError(`${service.url}${path.split("?")[0]} a répondu ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const jellyfinAuth = { Authorization: `MediaBrowser Token="${JELLYFIN.key}"` };

async function jellyfin(path) {
  const res = await fetch(JELLYFIN.url + path, { headers: jellyfinAuth, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new UpstreamError(`Jellyfin a répondu ${res.status}`);
  return res.json();
}

// La bibliothèque d'un Pi reste petite : on la lit en entier et on la garde une minute.
const libraryCache = new Map();
async function jellyfinItems(type) {
  const cached = libraryCache.get(type);
  if (cached && cached.at > Date.now() - 60_000) return cached.items;
  const data = await jellyfin(`/Items?Recursive=true&IncludeItemTypes=${type}&Fields=ProviderIds`);
  const items = data.Items ?? [];
  libraryCache.set(type, { at: Date.now(), items });
  return items;
}

async function findJellyfin(type, ids) {
  const items = await jellyfinItems(type === "movie" ? "Movie" : "Series");
  const item = items.find(
    (i) =>
      (ids.tmdbId && i.ProviderIds?.Tmdb === String(ids.tmdbId)) ||
      (ids.tvdbId && i.ProviderIds?.Tvdb === String(ids.tvdbId)),
  );
  if (!item) return null;
  return {
    id: item.Id,
    url: JELLYFIN_PUBLIC_URL ? `${JELLYFIN_PUBLIC_URL}/web/#/details?id=${item.Id}` : null,
  };
}

/** Téléchargements en cours : progression globale et temps restant. */
function summarizeQueue(records) {
  if (!records.length) return null;
  const size = records.reduce((s, r) => s + (r.size ?? 0), 0);
  const left = records.reduce((s, r) => s + (r.sizeleft ?? 0), 0);
  return {
    items: records.length,
    progress: size > 0 ? Math.round(((size - left) / size) * 100) : 0,
    status: records[0].trackedDownloadState ?? records[0].status ?? "queued",
    timeLeft: records[0].timeleft ?? null,
  };
}

async function settings(service) {
  const [profiles, folders] = await Promise.all([
    arr(service, "/api/v3/qualityprofile"),
    arr(service, "/api/v3/rootfolder"),
  ]);
  const wanted = process.env[service === RADARR ? "RADARR_QUALITY_PROFILE" : "SONARR_QUALITY_PROFILE"];
  const profile = (wanted && profiles.find((p) => p.name === wanted)) || profiles[0];
  if (!profile || !folders[0]) throw new UpstreamError("Configure un profil de qualité et un dossier racine.");
  return { qualityProfileId: profile.id, rootFolderPath: folders[0].path };
}

// --- Routes -----------------------------------------------------------------

async function movieStatus(tmdbId) {
  const [movie] = await arr(RADARR, `/api/v3/movie?tmdbId=${tmdbId}`);
  if (!movie) return { state: "missing" };
  if (movie.hasFile) {
    const item = await findJellyfin("movie", { tmdbId });
    // Le fichier est là mais Jellyfin ne l'a pas encore indexé.
    return item ? { state: "available", jellyfin: item } : { state: "importing" };
  }
  const queue = summarizeQueue(await arr(RADARR, `/api/v3/queue/details?movieId=${movie.id}`));
  return queue ? { state: "downloading", queue } : { state: "wanted" };
}

async function seriesStatus(tvdbId, tmdbId) {
  const [series] = await arr(SONARR, `/api/v3/series?tvdbId=${tvdbId}`);
  if (!series) return { state: "missing" };
  const [queue, item] = await Promise.all([
    arr(SONARR, `/api/v3/queue/details?seriesId=${series.id}`).then(summarizeQueue),
    findJellyfin("tv", { tvdbId, tmdbId }),
  ]);
  const stats = series.statistics ?? {};
  return {
    state: queue ? "downloading" : stats.episodeFileCount > 0 ? "available" : "wanted",
    episodes: { downloaded: stats.episodeFileCount ?? 0, total: stats.episodeCount ?? 0 },
    queue,
    jellyfin: item,
  };
}

async function requestMovie(tmdbId) {
  const [existing] = await arr(RADARR, `/api/v3/movie?tmdbId=${tmdbId}`);
  if (existing) {
    await arr(RADARR, "/api/v3/command", { method: "POST", body: JSON.stringify({ name: "MoviesSearch", movieIds: [existing.id] }) });
    return;
  }
  const lookup = await arr(RADARR, `/api/v3/movie/lookup/tmdb?tmdbId=${tmdbId}`);
  await arr(RADARR, "/api/v3/movie", {
    method: "POST",
    body: JSON.stringify({
      ...lookup,
      ...(await settings(RADARR)),
      monitored: true,
      minimumAvailability: "released",
      addOptions: { searchForMovie: true },
    }),
  });
}

async function requestSeries(tvdbId) {
  const [existing] = await arr(SONARR, `/api/v3/series?tvdbId=${tvdbId}`);
  if (existing) {
    await arr(SONARR, "/api/v3/command", { method: "POST", body: JSON.stringify({ name: "SeriesSearch", seriesId: existing.id }) });
    return;
  }
  const [lookup] = await arr(SONARR, `/api/v3/series/lookup?term=tvdb:${tvdbId}`);
  if (!lookup) throw new UpstreamError("Série introuvable dans Sonarr.");
  await arr(SONARR, "/api/v3/series", {
    method: "POST",
    body: JSON.stringify({
      ...lookup,
      ...(await settings(SONARR)),
      monitored: true,
      seasonFolder: true,
      addOptions: { monitor: "all", searchForMissingEpisodes: true },
    }),
  });
}

/** Lecture directe du fichier (sans transcodage, trop lourd pour un Pi), avec prise en charge du Range. */
async function stream(req, res, itemId) {
  const headers = { ...jellyfinAuth };
  if (req.headers.range) headers.Range = req.headers.range;
  const upstream = await fetch(`${JELLYFIN.url}/Videos/${itemId}/stream?static=true`, { headers });
  const out = {};
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
    const v = upstream.headers.get(h);
    if (v) out[h] = v;
  }
  res.writeHead(upstream.status, out);
  if (!upstream.body) return res.end();
  const body = Readable.fromWeb(upstream.body);
  res.on("close", () => body.destroy());
  body.pipe(res);
}

// --- Serveur ----------------------------------------------------------------

const positiveInt = (v) => (/^\d{1,9}$/.test(v ?? "") && Number(v) > 0 ? Number(v) : null);

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error("Requête trop grande.");
  }
  return JSON.parse(raw || "{}");
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const origin = req.headers.origin;
  if (origin && ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    if (!origin || !ORIGINS.has(origin)) return send(res, 403, { error: "Origine refusée." });
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      // Le Pi est sur une adresse privée (Tailscale) : Chrome demande cet accord.
      "Access-Control-Allow-Private-Network": "true",
      "Access-Control-Max-Age": "600",
    });
    return res.end();
  }

  if (url.pathname === "/health") return send(res, 200, { ok: true });

  const stream_ = url.pathname.match(/^\/stream\/([0-9a-f]{32})$/i);
  // Une balise <video> ne peut pas envoyer d'en-tête : le jeton de lecture passe dans l'URL.
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const claims = verifyToken(stream_ ? url.searchParams.get("t") : bearer);
  if (!claims) return send(res, 401, { error: "Jeton invalide ou expiré." });

  if (stream_ && req.method === "GET") {
    if (claims.scope !== "stream" || claims.item !== stream_[1]) return send(res, 403, { error: "Jeton non valable pour ce fichier." });
    return stream(req, res, stream_[1]);
  }
  if (claims.scope !== "api") return send(res, 403, { error: "Jeton non valable ici." });

  if (url.pathname === "/status" && req.method === "GET") {
    const type = url.searchParams.get("type");
    const tmdbId = positiveInt(url.searchParams.get("tmdbId"));
    const tvdbId = positiveInt(url.searchParams.get("tvdbId"));
    if (type === "movie" && tmdbId) return send(res, 200, await movieStatus(tmdbId));
    if (type === "tv" && tvdbId) return send(res, 200, await seriesStatus(tvdbId, tmdbId));
    return send(res, 400, { error: "Paramètres invalides." });
  }

  if (url.pathname === "/request" && req.method === "POST") {
    const body = await readJson(req);
    const tmdbId = positiveInt(String(body.tmdbId ?? ""));
    const tvdbId = positiveInt(String(body.tvdbId ?? ""));
    if (body.type === "movie" && tmdbId) await requestMovie(tmdbId);
    else if (body.type === "tv" && tvdbId) await requestSeries(tvdbId);
    else return send(res, 400, { error: "Paramètres invalides." });
    return send(res, 202, { ok: true });
  }

  return send(res, 404, { error: "Route inconnue." });
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (res.headersSent) return res.destroy();
    send(res, 502, { error: err instanceof UpstreamError ? err.message : "Erreur du proxy." });
  });
}).listen(PORT, () => console.log(`HouseFlix proxy sur le port ${PORT}`));
