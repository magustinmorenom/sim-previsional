import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthChallengeRequest } from "@/lib/types/auth";
import { fetchRemoteAffiliateSimulationContext } from "@/lib/server/remote-api-client";
import { isOtpBypassMode } from "@/lib/server/otp-delivery";
import { createBypassOtpChallenge } from "@/lib/server/otp-bypass-store";
import { sendOtpByEmail } from "@/lib/server/fake/email-sender";
import { createChallengeState, setAuthChallengeCookie } from "@/lib/server/session";

export const runtime = "nodejs";

const challengeRequestSchema = z.object({
  email: z.string().email()
});

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

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    try {
      await fetchRemoteAffiliateSimulationContext({ email: normalizedEmail });
    } catch {
      return NextResponse.json(
        {
          error: "Este correo no está registrado en el CPS, quizás tengas registrada otra dirección.",
          code: "EMAIL_NOT_REGISTERED"
        },
        { status: 404 }
      );
    }

    const otpChallenge = createBypassOtpChallenge({ email: normalizedEmail });
    const bypassMode = isOtpBypassMode();

    if (!bypassMode) {
      const delivery = await sendOtpByEmail({
        to: normalizedEmail,
        code: otpChallenge.code,
        challengeId: otpChallenge.challengeId
      });

      const response = NextResponse.json(
        {
          challengeId: otpChallenge.challengeId,
          expiresInSeconds: otpChallenge.expiresInSeconds,
          resendAvailableInSeconds: otpChallenge.resendAvailableInSeconds,
          ...(delivery.devMode ? { devMode: true, devOtpCode: otpChallenge.code } : {})
        },
        { status: 200 }
      );

      const challengeState = createChallengeState({
        challengeId: otpChallenge.challengeId,
        email: normalizedEmail,
        expiresInSeconds: otpChallenge.expiresInSeconds
      });
      setAuthChallengeCookie(response, challengeState);
      return response;
    }

    const response = NextResponse.json(
      {
        challengeId: otpChallenge.challengeId,
        expiresInSeconds: otpChallenge.expiresInSeconds,
        resendAvailableInSeconds: otpChallenge.resendAvailableInSeconds,
        devMode: true,
        devOtpCode: otpChallenge.code
      },
      { status: 200 }
    );

    const challengeState = createChallengeState({
      challengeId: otpChallenge.challengeId,
      email: normalizedEmail,
      expiresInSeconds: otpChallenge.expiresInSeconds
    });
    setAuthChallengeCookie(response, challengeState);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No fue posible iniciar el desafío del código de un solo uso.",
        details: message
      },
      { status: 502 }
    );
  }
}
