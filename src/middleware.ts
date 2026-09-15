import { NextRequest, NextResponse } from "next/server";
import {
  buildContentSecurityPolicy,
  createNonce,
  NONCE_REQUEST_HEADER,
} from "./lib/content-security-policy";

const ACCESS_TOKEN_COOKIE = "accessToken";
const DEFAULT_LOGIN_FRONT_URL = "http://localhost:5000/";

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
  const loginUrl = process.env.LOGIN_FRONT_URL || DEFAULT_LOGIN_FRONT_URL;
  const response = NextResponse.redirect(new URL(loginUrl, request.url));
  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return response;
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
