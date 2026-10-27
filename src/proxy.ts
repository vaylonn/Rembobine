import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = new URL("/connexion", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/") url.searchParams.set("depuis", from);
  return NextResponse.redirect(url);
}

export const config = {
  // Les fichiers de la PWA (manifeste, icônes) doivent rester lisibles sans être connecté.
  matcher: ["/((?!connexion|_next/static|_next/image|manifest.webmanifest|icon.svg|apple-icon.png|icons/).*)"],
};
