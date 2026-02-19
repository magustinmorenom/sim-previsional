import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthChallengeRequest } from "@/lib/types/auth";
import {
  createRemoteAuthChallenge,
  RemoteApiError
} from "@/lib/server/remote-api-client";
import { createChallengeState, setAuthChallengeCookie } from "@/lib/server/session";

export const runtime = "nodejs";

const challengeRequestSchema = z.object({
  email: z.string().email()
});

function buildRemoteErrorResponse(error: RemoteApiError): NextResponse {
  if (error.status === 400 || error.status === 401 || error.status === 429) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      error: "No fue posible iniciar el desafío OTP.",
      code: error.code,
      details: error.details
    },
    { status: 502 }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as AuthChallengeRequest;
    const parsed = challengeRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const challenge = await createRemoteAuthChallenge(parsed.data);
    const response = NextResponse.json(challenge, { status: 200 });

    const challengeState = createChallengeState({
      challengeId: challenge.challengeId,
      email: parsed.data.email,
      expiresInSeconds: challenge.expiresInSeconds
    });
    setAuthChallengeCookie(response, challengeState);

    return response;
  } catch (error) {
    if (error instanceof RemoteApiError) {
      return buildRemoteErrorResponse(error);
    }

    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No fue posible iniciar el desafío OTP.",
        details: message
      },
      { status: 502 }
    );
  }
}
