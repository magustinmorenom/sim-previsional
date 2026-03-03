import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getModuleByPath } from "@/lib/config/module-access";

const DEFAULT_SESSION_COOKIE_NAME = "sp_session";

function getSessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

function isAuthenticated(request: NextRequest): boolean {
  return Boolean(request.cookies.get(getSessionCookieName())?.value);
}

function buildLoginRedirect(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  const targetPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.pathname = "/app/acceso";
  url.searchParams.set("next", targetPath);

  return url;
}

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

function withDeviceCookie(request: NextRequest, response: NextResponse): NextResponse {
  const ua = request.headers.get("user-agent") || "";
  const deviceType = MOBILE_UA_REGEX.test(ua) ? "mobile" : "desktop";
  response.cookies.set("device-type", deviceType, {
    path: "/",
    httpOnly: false,
    sameSite: "lax"
  });
  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/app")) {
    return withDeviceCookie(request, NextResponse.next());
  }

  if (pathname === "/app/acceso") {
    return withDeviceCookie(request, NextResponse.next());
  }

  const module = getModuleByPath(pathname);
  if (!module) {
    return withDeviceCookie(request, NextResponse.next());
  }

  if (module.visibility === "public") {
    return withDeviceCookie(request, NextResponse.next());
  }

  if (isAuthenticated(request)) {
    return withDeviceCookie(request, NextResponse.next());
  }

  return withDeviceCookie(request, NextResponse.redirect(buildLoginRedirect(request)));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
