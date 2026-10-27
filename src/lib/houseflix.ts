import "server-only";
import { SignJWT } from "jose";

// HouseFlix : le serveur média sur le Pi. Les serveurs de Vercel ne peuvent pas
// le joindre (il n'est visible que sur Tailscale), donc c'est le navigateur qui
// appelle le proxy du Pi, avec un jeton court signé ici.

export function houseflixUrl() {
  const url = process.env.HOUSEFLIX_URL?.replace(/\/$/, "");
  return url && process.env.HOUSEFLIX_SECRET ? url : null;
}

/**
 * Mode démo : faux proxy dans le navigateur, pour voir l'encart sans Pi.
 * Actif avec HOUSEFLIX_DEMO=1, ou d'office sur les prévisualisations Vercel tant
 * que HouseFlix n'est pas configuré.
 */
export function houseflixDemo() {
  if (houseflixUrl()) return false;
  return process.env.HOUSEFLIX_DEMO === "1" || process.env.VERCEL_ENV === "preview";
}

function secret() {
  const value = process.env.HOUSEFLIX_SECRET;
  if (!value || value.length < 32) {
    throw new Error("HOUSEFLIX_SECRET doit faire au moins 32 caractères.");
  }
  return new TextEncoder().encode(value);
}

function sign(claims: Record<string, string>, ttl: string) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("houseflix")
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret());
}

/** Jeton pour les routes de statut et de demande. */
export function apiToken() {
  return sign({ scope: "api" }, "15m");
}

/** Jeton de lecture, limité à un fichier et assez long pour un film entier. */
export function streamToken(itemId: string) {
  return sign({ scope: "stream", item: itemId }, "8h");
}
