import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "DEPRECATED_ENDPOINT",
        message: "El endpoint de tasas fue reemplazado por /api/v1/public/prestamos/lineas y /api/v1/public/prestamos/simulate."
      }
    },
    { status: 410 }
  );
}
