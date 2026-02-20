import { NextResponse } from "next/server";
import {
  getPrestamosTasas,
  PrestamosPublicApiError
} from "@/lib/server/public-prestamos-client";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getPrestamosTasas();

    return NextResponse.json(
      {
        ...result.data,
        source: result.source
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PrestamosPublicApiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message
        }
      },
      { status: 500 }
    );
  }
}
