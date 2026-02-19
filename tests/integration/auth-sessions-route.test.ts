import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import {
  DELETE as deleteSession,
  GET as getSession,
  POST as createSession
} from "@/app/api/v1/auth/sessions/route";
import {
  createChallengeState,
  getAuthChallengeCookieName,
  getAuthSessionCookieName,
  setAuthChallengeCookie
} from "@/lib/server/session";

function buildChallengeCookieHeader(): string {
  const challengeName = getAuthChallengeCookieName();
  const response = NextResponse.json({ ok: true });

  setAuthChallengeCookie(
    response,
    createChallengeState({
      challengeId: "challenge-001",
      email: "afiliado@test.com",
      expiresInSeconds: 600
    })
  );

  const cookie = response.cookies.get(challengeName);
  return `${challengeName}=${cookie?.value}`;
}

describe("/api/v1/auth/sessions", () => {
  const originalBaseUrl = process.env.REMOTE_API_BASE_URL;

  beforeEach(() => {
    process.env.REMOTE_API_BASE_URL = "https://remote.example.test";
  });

  afterEach(() => {
    process.env.REMOTE_API_BASE_URL = originalBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("valida OTP y crea sesión", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/v1/auth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: buildChallengeCookieHeader()
      },
      body: JSON.stringify({
        challengeId: "challenge-001",
        code: "123456"
      })
    });

    const response = await createSession(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(response.cookies.get(getAuthSessionCookieName())?.value).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("responde 401 si no existe challenge activo", async () => {
    const request = new Request("http://localhost/api/v1/auth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        challengeId: "challenge-001",
        code: "123456"
      })
    });

    const response = await createSession(request);
    expect(response.status).toBe(401);
  });

  it("responde authenticated=false cuando no hay sesión", async () => {
    const request = new Request("http://localhost/api/v1/auth/sessions", {
      method: "GET"
    });

    const response = await getSession(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
  });

  it("obtiene y elimina sesión", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const createRequest = new Request("http://localhost/api/v1/auth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: buildChallengeCookieHeader()
      },
      body: JSON.stringify({
        challengeId: "challenge-001",
        code: "123456"
      })
    });

    const createResponse = await createSession(createRequest);
    const sessionCookie = createResponse.cookies.get(getAuthSessionCookieName())?.value;

    const getRequest = new Request("http://localhost/api/v1/auth/sessions", {
      method: "GET",
      headers: {
        cookie: `${getAuthSessionCookieName()}=${sessionCookie}`
      }
    });

    const getResponse = await getSession(getRequest);
    expect(getResponse.status).toBe(200);

    const deleteResponse = await deleteSession();
    expect(deleteResponse.status).toBe(204);
  });
});
