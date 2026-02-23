import { NextResponse } from "next/server";
import { z } from "zod";
import type { CreateSessionRequest } from "@/lib/types/auth";
import {
  fetchRemoteAffiliateSimulationContext,
  verifyRemoteAuthCode,
  RemoteApiError
} from "@/lib/server/remote-api-client";
import {
  clearAuthChallengeCookie,
  clearAuthSessionCookie,
  getAuthChallengeFromRequest,
  getAuthSessionFromRequest,
  increaseChallengeAttempts,
  isChallengeExpired,
  setAuthChallengeCookie,
  setAuthSessionCookie
} from "@/lib/server/session";

export const runtime = "nodejs";

const createSessionSchema = z.object({
  challengeId: z.string().trim().min(1),
  code: z.string().regex(/^\d{6}$/, "El código de un solo uso debe tener 6 dígitos")
});

interface AffiliateIdentity {
  fullName?: string;
  fileNumber?: string;
}

function buildFallbackAffiliateName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "Afiliado";
  }

  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Afiliado";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function readPathValue(payload: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = payload;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function readString(payload: Record<string, unknown>, paths: string[]): string | null {
  for (const path of paths) {
    const value = readPathValue(payload, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function pickAffiliateIdentity(remotePayload: unknown, email: string): AffiliateIdentity {
  if (!remotePayload || typeof remotePayload !== "object") {
    return {
      fullName: buildFallbackAffiliateName(email)
    };
  }

  const payload = remotePayload as Record<string, unknown>;
  const fullName =
    readString(payload, ["affiliate.fullName", "affiliate.name", "fullName", "name"]) ??
    buildFallbackAffiliateName(email);
  const fileNumber = readString(payload, [
    "affiliate.fileNumber",
    "affiliate.legajo",
    "affiliate.memberNumber",
    "affiliate.memberId",
    "fileNumber",
    "legajo",
    "memberNumber",
    "memberId"
  ]);

  return {
    fullName,
    ...(fileNumber ? { fileNumber } : {})
  };
}

function errorResponse(
  status: number,
  body: { error: string; code: string; details?: unknown },
  mutateCookies?: (response: NextResponse) => void
): NextResponse {
  const response = NextResponse.json(body, { status });
  if (mutateCookies) {
    mutateCookies(response);
  }
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as CreateSessionRequest;
    const parsed = createSessionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const challengeState = getAuthChallengeFromRequest(request);
    if (!challengeState) {
      return errorResponse(401, {
        error: "No existe un desafío de código de un solo uso activo.",
        code: "AUTH_CHALLENGE_REQUIRED"
      });
    }

    if (challengeState.challengeId !== parsed.data.challengeId) {
      return errorResponse(401, {
        error: "El desafío de código de un solo uso no coincide con la sesión activa.",
        code: "AUTH_CHALLENGE_MISMATCH"
      });
    }

    if (isChallengeExpired(challengeState)) {
      return errorResponse(
        410,
        {
          error: "El código de un solo uso expiró. Solicitá uno nuevo.",
          code: "OTP_EXPIRED"
        },
        (response) => {
          clearAuthChallengeCookie(response);
        }
      );
    }

    if (challengeState.attempts >= challengeState.maxAttempts) {
      return errorResponse(
        429,
        {
          error: "Se alcanzó el máximo de intentos para este código de un solo uso.",
          code: "OTP_MAX_ATTEMPTS_REACHED"
        },
        (response) => {
          clearAuthChallengeCookie(response);
        }
      );
    }

    const updatedChallengeState = increaseChallengeAttempts(challengeState);

    try {
      await verifyRemoteAuthCode(parsed.data);
      let identity: AffiliateIdentity = {
        fullName: buildFallbackAffiliateName(challengeState.email)
      };

      try {
        const remotePayload = await fetchRemoteAffiliateSimulationContext({
          email: challengeState.email
        });
        identity = pickAffiliateIdentity(remotePayload, challengeState.email);
      } catch {
        // No bloquea login si falla la consulta de identidad.
      }

      const response = NextResponse.json({ authenticated: true }, { status: 200 });
      setAuthSessionCookie(response, {
        email: challengeState.email,
        fullName: identity.fullName,
        fileNumber: identity.fileNumber
      });
      clearAuthChallengeCookie(response);
      return response;
    } catch (error) {
      if (error instanceof RemoteApiError) {
        if (error.status === 400 || error.status === 401 || error.status === 410 || error.status === 429) {
          return errorResponse(
            error.status,
            {
              error: error.message,
              code: error.code,
              details: error.details
            },
            (response) => {
              if (error.status === 410 || error.status === 429) {
                clearAuthChallengeCookie(response);
                return;
              }

              setAuthChallengeCookie(response, updatedChallengeState);
            }
          );
        }

        return errorResponse(
          502,
          {
            error: "No fue posible validar el código de un solo uso.",
            code: error.code,
            details: error.details
          },
          (response) => {
            setAuthChallengeCookie(response, updatedChallengeState);
          }
        );
      }

      const message = error instanceof Error ? error.message : "Error no controlado";
      return errorResponse(
        502,
        {
          error: "No fue posible validar el código de un solo uso.",
          code: "OTP_VALIDATION_FAILED",
          details: message
        },
        (response) => {
          setAuthChallengeCookie(response, updatedChallengeState);
        }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No fue posible iniciar sesión.",
        code: "AUTH_SESSION_CREATE_FAILED",
        details: message
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = getAuthSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: session.email,
      ...(session.fullName ? { fullName: session.fullName } : {}),
      ...(session.fileNumber ? { fileNumber: session.fileNumber } : {})
    },
    { status: 200 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  clearAuthSessionCookie(response);
  clearAuthChallengeCookie(response);
  return response;
}
