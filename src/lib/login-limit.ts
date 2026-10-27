import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "./db";
import { loginFailures } from "./schema";

const WINDOW_MS = 15 * 60 * 1000;
// Par adresse IP, puis tous visiteurs confondus (au cas où l'attaque change d'IP).
const MAX_PER_IP = 5;
const MAX_TOTAL = 30;

export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
}

/** Vrai si trop d'échecs récents : on refuse alors de vérifier le mot de passe. */
export async function isLoginBlocked(ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [[perIp], [total]] = await Promise.all([
    db()
      .select({ n: count() })
      .from(loginFailures)
      .where(and(eq(loginFailures.ip, ip), gt(loginFailures.createdAt, since))),
    db().select({ n: count() }).from(loginFailures).where(gt(loginFailures.createdAt, since)),
  ]);
  return perIp.n >= MAX_PER_IP || total.n >= MAX_TOTAL;
}

export async function recordLoginFailure(ip: string) {
  await db().insert(loginFailures).values({ ip });
  // Ménage : on ne garde qu'une journée d'échecs.
  await db()
    .delete(loginFailures)
    .where(lt(loginFailures.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}

export async function clearLoginFailures(ip: string) {
  await db().delete(loginFailures).where(eq(loginFailures.ip, ip));
}
