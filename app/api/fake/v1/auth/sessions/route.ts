import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyFakeOtpCode } from "@/lib/server/fake/otp-store";

export const runtime = "nodejs";

const payloadSchema = z.object({
  challengeId: z.string().trim().min(1),
  code: z.string().regex(/^\d{6}$/, "El código de un solo uso debe tener 6 dígitos")
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const parsed = payloadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          code: "FAKE_AUTH_SESSION_INVALID_PAYLOAD",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const verification = verifyFakeOtpCode({
      challengeId: parsed.data.challengeId,
      code: parsed.data.code
    });

    if (!verification.ok) {
      return NextResponse.json(
        {
          error: verification.error,
          code: verification.code
        },
        { status: verification.status }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        email: verification.email
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No se pudo validar el código de un solo uso fake.",
        code: "FAKE_AUTH_SESSION_ERROR",
        details: message
      },
      { status: 502 }
    );
  }
}
