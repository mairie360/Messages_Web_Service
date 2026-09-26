import { NextRequest, NextResponse } from "next/server";
import { parseFrontUrl } from "./lib/front-url";
import { ACCESS_TOKEN_COOKIE, clearAccessTokenCookie } from "./lib/access-token-cookie";
import { readFrontUrlsFromEnv } from "./lib/front-urls";
import {
  buildContentSecurityPolicy,
  createNonce,
  NONCE_REQUEST_HEADER,
} from "./lib/content-security-policy";

type JwtPayload = {
  exp?: unknown;
};

function isExpiredJwt(token: string) {
  const segments = token.split(".");

  if (segments.length !== 3) {
    return false;
  }

  try {
    const base64Payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");
    const payload = JSON.parse(atob(base64Payload)) as JwtPayload;

    return (
      typeof payload.exp === "number" &&
      payload.exp * 1000 <= Date.now()
    );
  } catch {
    return true;
  }
}

function redirectToLogin(request: NextRequest) {
  const destination = parseFrontUrl(process.env.LOGIN_FRONT_URL);
  const publicFrontUrl = readFrontUrlsFromEnv().MESSAGE_FRONT_URL;
  if (destination && publicFrontUrl) {
    try {
      const requestedPage = new URL(publicFrontUrl);
      requestedPage.pathname = request.nextUrl.pathname;
      requestedPage.search = request.nextUrl.search;
      destination.searchParams.set("redirect", requestedPage.href);
    } catch {
      // A missing or invalid public URL leaves Login's default destination in place.
    }
  }

  const response = destination ? NextResponse.redirect(destination) : new NextResponse(
    "Connexion temporairement indisponible. Veuillez contacter votre administrateur.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
  return clearAccessTokenCookie(response);
}

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken || isExpiredJwt(accessToken)) {
    return redirectToLogin(request);
  }

  // Next.js lit la CSP de la requête pour poser le nonce sur ses propres scripts :
  // les pages doivent donc être rendues à la demande (voir src/app/layout.tsx).
  const nonce = createNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_REQUEST_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
