import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createAuthChallenge } from "@/app/api/v1/auth/challenges/route";
import { getAuthChallengeCookieName } from "@/lib/server/session";

describe("POST /api/v1/auth/challenges", () => {
  const originalBaseUrl = process.env.REMOTE_API_BASE_URL;

  beforeEach(() => {
    process.env.REMOTE_API_BASE_URL = "https://remote.example.test";
  });

  afterEach(() => {
    process.env.REMOTE_API_BASE_URL = originalBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("crea el challenge OTP y setea cookie temporal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          challengeId: "challenge-001",
          expiresInSeconds: 600,
          resendAvailableInSeconds: 60
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/v1/auth/challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "afiliado@test.com"
      })
    });

    const response = await createAuthChallenge(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.challengeId).toBe("challenge-001");
    expect(response.cookies.get(getAuthChallengeCookieName())?.value).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("responde 400 cuando el payload es inválido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/v1/auth/challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "correo-invalido"
      })
    });

    const response = await createAuthChallenge(request);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
