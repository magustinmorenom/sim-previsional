import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  createChallengeState,
  getAuthChallengeCookieName,
  getAuthChallengeFromRequest,
  getAuthSessionCookieName,
  getAuthSessionFromRequest,
  increaseChallengeAttempts,
  setAuthChallengeCookie,
  setAuthSessionCookie
} from "@/lib/server/session";

describe("session cookie utilities", () => {
  it("crea y lee una cookie de sesión autenticada", () => {
    const response = NextResponse.json({ ok: true });
    setAuthSessionCookie(response, {
      email: "afiliado@test.com"
    });

    const cookieName = getAuthSessionCookieName();
    const cookie = response.cookies.get(cookieName);

    expect(cookie?.value).toBeTruthy();

    const request = new Request("http://localhost", {
      headers: {
        cookie: `${cookieName}=${cookie?.value}`
      }
    });

    const session = getAuthSessionFromRequest(request);
    expect(session?.email).toBe("afiliado@test.com");
  });

  it("incrementa intentos y mantiene estado de challenge", () => {
    const challenge = createChallengeState({
      challengeId: "challenge-1",
      email: "afiliado@test.com",
      expiresInSeconds: 600
    });

    const increased = increaseChallengeAttempts(challenge);
    expect(increased.attempts).toBe(1);

    const response = NextResponse.json({ ok: true });
    setAuthChallengeCookie(response, increased);

    const cookieName = getAuthChallengeCookieName();
    const cookie = response.cookies.get(cookieName);

    const request = new Request("http://localhost", {
      headers: {
        cookie: `${cookieName}=${cookie?.value}`
      }
    });

    const parsedChallenge = getAuthChallengeFromRequest(request);
    expect(parsedChallenge?.challengeId).toBe("challenge-1");
    expect(parsedChallenge?.attempts).toBe(1);
  });
});
