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

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  if (pathname === "/app/acceso") {
    return NextResponse.next();
  }

  const module = getModuleByPath(pathname);
  if (!module) {
    return NextResponse.next();
  }

  if (module.visibility === "public") {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildLoginRedirect(request));
}

export const config = {
  matcher: ["/app/:path*"]
};
