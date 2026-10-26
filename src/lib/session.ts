import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rembobine_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET doit faire au moins 32 caractères.");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken() {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
