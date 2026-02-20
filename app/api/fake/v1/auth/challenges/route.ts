import { NextResponse } from "next/server";
import { z } from "zod";
import { getFakeAffiliateByEmail } from "@/lib/server/fake/fake-affiliate-repository";
import {
  createFakeOtpChallenge,
  getFakeOtpChallengeMetadata,
  getFakeOtpDebugCode
} from "@/lib/server/fake/otp-store";
import { sendOtpByEmail } from "@/lib/server/fake/email-sender";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const parsed = payloadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          code: "FAKE_AUTH_CHALLENGE_INVALID_PAYLOAD",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const affiliate = getFakeAffiliateByEmail(email);

    if (!affiliate) {
      return NextResponse.json(
        {
          error: "El correo no está habilitado en la API fake.",
          code: "FAKE_AUTH_EMAIL_NOT_ALLOWED"
        },
        { status: 401 }
      );
    }

    const challenge = createFakeOtpChallenge(email);

    const delivery = await sendOtpByEmail({
      to: email,
      code: challenge.code,
      challengeId: challenge.challengeId
    });

    const metadata = getFakeOtpChallengeMetadata(challenge.challengeId);
    if (!metadata) {
      return NextResponse.json(
        {
          error: "No se pudo persistir el desafío OTP.",
          code: "FAKE_AUTH_CHALLENGE_STORE_ERROR"
        },
        { status: 502 }
      );
    }

    const responsePayload: Record<string, unknown> = {
      challengeId: challenge.challengeId,
      expiresInSeconds: metadata.expiresInSeconds,
      resendAvailableInSeconds: metadata.resendAvailableInSeconds
    };

    if (delivery.devMode) {
      responsePayload.devOtpCode = getFakeOtpDebugCode(challenge.challengeId);
      responsePayload.devMode = true;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No se pudo crear el desafío OTP fake.",
        code: "FAKE_AUTH_CHALLENGE_ERROR",
        details: message
      },
      { status: 502 }
    );
  }
}
