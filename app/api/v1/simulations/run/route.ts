import { NextResponse } from "next/server";
import { runSimulationInWorker } from "@/lib/calc/worker-runner";
import { simulationInputSchema } from "@/lib/validation/simulation-input";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const parsed = simulationInputSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    if (parsed.data.beneficiaries.length > 12) {
      return NextResponse.json(
        {
          error:
            "El cálculo exacto 1:1 con VBA está habilitado hasta n <= 12 por complejidad combinatoria (2^n)."
        },
        { status: 422 }
      );
    }

    const result = await runSimulationInWorker(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No fue posible ejecutar la simulación",
        details: message
      },
      { status: 500 }
    );
  }
}
