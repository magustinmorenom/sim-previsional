import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET as getSimulationContext } from "@/app/api/v1/affiliates/me/simulation-context/route";
import {
  getAuthSessionCookieName,
  setAuthSessionCookie
} from "@/lib/server/session";

function buildSessionCookieHeader(): string {
  const response = NextResponse.json({ ok: true });
  const name = getAuthSessionCookieName();

  setAuthSessionCookie(response, {
    email: "afiliado@test.com"
  });

  const cookie = response.cookies.get(name);
  return `${name}=${cookie?.value}`;
}

describe("GET /api/v1/affiliates/me/simulation-context", () => {
  const originalBaseUrl = process.env.REMOTE_API_BASE_URL;

  beforeEach(() => {
    process.env.REMOTE_API_BASE_URL = "https://remote.example.test";
  });

  afterEach(() => {
    process.env.REMOTE_API_BASE_URL = originalBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("responde 401 sin sesión", async () => {
    const request = new Request("http://localhost/api/v1/affiliates/me/simulation-context", {
      method: "GET"
    });

    const response = await getSimulationContext(request);
    expect(response.status).toBe(401);
  });

  it("mapea correctamente el payload remoto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          calculationDate: "2026-02-19",
          funds: {
            mandatory: 3000000,
            voluntary: 481733.27
          },
          bov: 200832.23,
          mandatoryContribution: {
            startAge: 58,
            endAge: 65
          },
          voluntaryContribution: {
            startAge: 58,
            endAge: 65
          },
          beneficiaries: [
            {
              type: "T",
              sex: 1,
              birthDate: "1966-05-19",
              invalid: 0
            },
            {
              type: "C",
              sex: 2,
              birthDate: "1972-04-07",
              invalid: 0
            }
          ]
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

    const request = new Request("http://localhost/api/v1/affiliates/me/simulation-context", {
      method: "GET",
      headers: {
        cookie: buildSessionCookieHeader()
      }
    });

    const response = await getSimulationContext(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.funds.total).toBe(3481733.27);
    expect(body.bov).toBe(200832.23);
    expect(body.affiliate.fullName).toBe("Afiliado");
    expect(body.beneficiaries[0].fullName).toBe("Titular");
    expect(body.beneficiaries).toHaveLength(2);
  });

  it("responde 422 cuando faltan datos obligatorios", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          calculationDate: "2026-02-19",
          bov: 200832.23,
          beneficiaries: [
            {
              type: "T",
              sex: 1,
              birthDate: "1966-05-19",
              invalid: 0
            }
          ]
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

    const request = new Request("http://localhost/api/v1/affiliates/me/simulation-context", {
      method: "GET",
      headers: {
        cookie: buildSessionCookieHeader()
      }
    });

    const response = await getSimulationContext(request);
    expect(response.status).toBe(422);
  });
});
