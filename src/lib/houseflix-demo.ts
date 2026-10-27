// Faux proxy HouseFlix, pour voir l'encart sans Raspberry Pi. Tout se passe dans
// le navigateur : une demande avance de quelques pour cent à chaque lecture du statut.

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const EPISODES = 10;

type Fake = { requested: boolean; progress: number };
const titles = new Map<string, Fake>();

export const DEMO_POLL = 1500;

export function demoStreamUrl() {
  return SAMPLE_VIDEO;
}

export async function demoCall(path: string, init?: RequestInit) {
  const url = new URL(path, "http://demo");
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  const type = body?.type ?? url.searchParams.get("type");
  const key = `${type}:${body?.tmdbId ?? url.searchParams.get("tmdbId")}`;
  const fake = titles.get(key) ?? { requested: false, progress: 0 };
  titles.set(key, fake);

  if (url.pathname === "/request") {
    fake.requested = true;
    return { ok: true };
  }

  if (!fake.requested) {
    return type === "tv"
      ? { state: "missing", episodes: { downloaded: 0, total: 0 }, queue: null, jellyfin: null }
      : { state: "missing" };
  }
  fake.progress = Math.min(110, fake.progress + 9);
  const jellyfin = { id: "0".repeat(32), url: null };
  const queue = (progress: number) => ({
    items: type === "tv" ? EPISODES : 1,
    progress,
    status: "downloading",
    timeLeft: `00:0${Math.max(0, Math.round((100 - progress) / 12))}:00`,
  });

  if (type === "tv") {
    const done = fake.progress >= 100;
    return {
      state: done ? "available" : "downloading",
      episodes: { downloaded: Math.min(EPISODES, Math.floor(fake.progress / 10)), total: EPISODES },
      queue: done ? null : queue(fake.progress),
      jellyfin: fake.progress >= 10 ? jellyfin : null,
    };
  }
  if (fake.progress < 100) return { state: "downloading", queue: queue(fake.progress) };
  if (fake.progress < 110) return { state: "importing" };
  return { state: "available", jellyfin };
}
