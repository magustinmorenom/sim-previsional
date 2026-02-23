import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isPrestamosSimulationEnabled,
  postPrestamosSimulacion,
  PrestamosPublicApiError
} from "@/lib/server/public-prestamos-client";
import type { PrestamosSimularRequest } from "@/lib/types/prestamos-public";

export const runtime = "nodejs";

const simulationRequestSchema = z.object({
  lineaPrestamoId: z.number().int().positive(),
  montoOtorgado: z.number().positive(),
  cantidadCuotas: z.number().int().positive(),
  sistemaAmortizacion: z.enum(["FRANCES", "ALEMAN"]).optional()
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!isPrestamosSimulationEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FEATURE_DISABLED",
          message: "La simulación de préstamos nativa aún no está habilitada en esta etapa."
        }
      },
      { status: 501 }
    );
  }

  try {
    const rawPayload = (await request.json()) as PrestamosSimularRequest;
    const parsed = simulationRequestSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payload inválido para simulación de préstamos.",
            details: parsed.error.flatten()
          }
        },
        { status: 400 }
      );
    }

    const result = await postPrestamosSimulacion(parsed.data);

    return NextResponse.json(result, { status: 200 });
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
