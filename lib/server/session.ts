import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_SESSION_COOKIE_NAME = "sp_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const CHALLENGE_MAX_AGE_SECONDS = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;

export interface AuthSessionState {
  email: string;
  expiresAt: number;
  fullName?: string;
  fileNumber?: string;
}

export interface AuthChallengeState {
  challengeId: string;
  email: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
}

function getSessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET?.trim() || "dev-auth-session-secret";
}

export function getAuthSessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

export function getAuthChallengeCookieName(): string {
  return `${getAuthSessionCookieName()}_challenge`;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function encodeSigned<T>(payload: T): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeSigned<T>(value: string): T | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function readCookieFromRequest(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

function setSignedCookie(
  response: NextResponse,
  name: string,
  payload: AuthSessionState | AuthChallengeState,
  maxAge: number
): void {
  response.cookies.set({
    name,
    value: encodeSigned(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge
  });
}

export function setAuthSessionCookie(
  response: NextResponse,
  payload: { email: string; fullName?: string | null; fileNumber?: string | null }
): void {
  const expiresAt = nowEpochSeconds() + SESSION_MAX_AGE_SECONDS;
  const normalizedFullName = payload.fullName?.trim();
  const normalizedFileNumber = payload.fileNumber?.trim();
  const state: AuthSessionState = {
    email: payload.email,
    expiresAt,
    ...(normalizedFullName ? { fullName: normalizedFullName } : {}),
    ...(normalizedFileNumber ? { fileNumber: normalizedFileNumber } : {})
  };

  setSignedCookie(response, getAuthSessionCookieName(), state, SESSION_MAX_AGE_SECONDS);
}

export function parseAuthSessionCookieValue(rawValue: string | null | undefined): AuthSessionState | null {
  if (!rawValue) {
    return null;
  }

  let decodedValue = rawValue;
  try {
    decodedValue = decodeURIComponent(rawValue);
  } catch {
    decodedValue = rawValue;
  }

  const payload = decodeSigned<AuthSessionState>(decodedValue);
  if (!payload) {
    return null;
  }

  if (!payload.email || typeof payload.expiresAt !== "number") {
    return null;
  }

  if (
    ("fullName" in payload && payload.fullName !== undefined && typeof payload.fullName !== "string") ||
    ("fileNumber" in payload && payload.fileNumber !== undefined && typeof payload.fileNumber !== "string")
  ) {
    return null;
  }

  if (payload.expiresAt <= nowEpochSeconds()) {
    return null;
  }

  return payload;
}

export function getAuthSessionFromRequest(request: Request): AuthSessionState | null {
  const raw = readCookieFromRequest(request, getAuthSessionCookieName());
  return parseAuthSessionCookieValue(raw);
}

export function clearAuthSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: getAuthSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0
  });
}

export function createChallengeState(payload: {
  challengeId: string;
  email: string;
  expiresInSeconds?: number;
}): AuthChallengeState {
  const ttl =
    typeof payload.expiresInSeconds === "number" && Number.isFinite(payload.expiresInSeconds)
      ? Math.max(1, Math.min(CHALLENGE_MAX_AGE_SECONDS, Math.floor(payload.expiresInSeconds)))
      : CHALLENGE_MAX_AGE_SECONDS;

  return {
    challengeId: payload.challengeId,
    email: payload.email,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: nowEpochSeconds() + ttl
  };
}

export function setAuthChallengeCookie(response: NextResponse, state: AuthChallengeState): void {
  const maxAge = Math.max(1, state.expiresAt - nowEpochSeconds());
  setSignedCookie(response, getAuthChallengeCookieName(), state, maxAge);
}

export function getAuthChallengeFromRequest(request: Request): AuthChallengeState | null {
  const raw = readCookieFromRequest(request, getAuthChallengeCookieName());
  if (!raw) {
    return null;
  }

  const payload = decodeSigned<AuthChallengeState>(raw);
  if (!payload) {
    return null;
  }

  if (
    !payload.challengeId ||
    !payload.email ||
    typeof payload.attempts !== "number" ||
    typeof payload.maxAttempts !== "number" ||
    typeof payload.expiresAt !== "number"
  ) {
    return null;
  }

  return payload;
}

export function clearAuthChallengeCookie(response: NextResponse): void {
  response.cookies.set({
    name: getAuthChallengeCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0
  });
}

export function isChallengeExpired(state: AuthChallengeState): boolean {
  return state.expiresAt <= nowEpochSeconds();
}

export function increaseChallengeAttempts(state: AuthChallengeState): AuthChallengeState {
  return {
    ...state,
    attempts: state.attempts + 1
  };
}
