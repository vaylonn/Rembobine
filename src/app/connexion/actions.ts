"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";

function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function safeRedirectTarget(value: FormDataEntryValue | null) {
  const target = typeof value === "string" ? value : "";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export async function login(_prev: string | null, formData: FormData) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return "APP_PASSWORD n'est pas configuré sur le serveur.";

  const password = String(formData.get("password") ?? "");
  if (!sameSecret(password, expected)) return "Mot de passe incorrect.";

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(safeRedirectTarget(formData.get("depuis")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/connexion");
}
