import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { runSimulationInWorker } from "@/lib/calc/worker-runner";
import type { SimulationInput, SimulationResult } from "@/lib/types/simulation";
import { simulationInputSchema } from "@/lib/validation/simulation-input";

export const runtime = "nodejs";

interface ReportPayload {
  input: SimulationInput;
  result?: SimulationResult;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as ReportPayload;
    const parsed = simulationInputSchema.safeParse(payload.input);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.beneficiaries.length > 12) {
      return NextResponse.json(
        {
          error:
            "El reporte PDF requiere una simulación exacta válida con n <= 12 beneficiarios."
        },
        { status: 422 }
      );
    }

    const result = payload.result ?? (await runSimulationInWorker(parsed.data));
    const bytes = await buildPdf(parsed.data, result);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=simulacion-ceer-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";
    return NextResponse.json(
      {
        error: "No se pudo generar el PDF",
        details: message
      },
      { status: 500 }
    );
  }
}

async function buildPdf(
  input: SimulationInput,
  result: SimulationResult
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const lineHeight = 16;

  const writeLine = (text: string, isTitle = false): void => {
    if (y < 40) {
      y = 800;
      page = doc.addPage([595, 842]);
    }

    page.drawText(text, {
      x: 40,
      y,
      size: isTitle ? 12 : 10,
      font: isTitle ? bold : font
    });
    y -= lineHeight;
  };

  writeLine("Simulador Previsional CEER 2025", true);
  writeLine("Reporte de simulación", true);
  writeLine("");

  writeLine("Entradas", true);
  writeLine(`Fecha de cálculo: ${input.calculationDate}`);
  writeLine(`Saldo cuenta: ${input.accountBalance}`);
  writeLine(`BOV: ${input.bov}`);
  writeLine(
    `Aportes obligatorios: ${input.mandatoryContribution.startAge} a ${input.mandatoryContribution.endAge}`
  );
  writeLine(
    `Aportes voluntarios: ${input.voluntaryContribution.startAge} a ${input.voluntaryContribution.endAge}`
  );
  writeLine(`Importe voluntario mensual: ${input.voluntaryContribution.monthlyAmount}`);
  writeLine(`Cantidad de beneficiarios: ${input.beneficiaries.length}`);
  writeLine("");

  writeLine("Beneficiarios", true);
  input.beneficiaries.forEach((b, idx) => {
    writeLine(
      `${idx + 1}. Tipo=${b.type} Sexo=${b.sex} Nacimiento=${b.birthDate} Invalidez=${b.invalid}`
    );
  });
  writeLine("");

  writeLine("Resultados", true);
  writeLine(`PPUU: ${result.ppuu}`);
  writeLine(`Saldo Final: ${result.finalBalance}`);
  writeLine(`Beneficio Proyectado: ${result.projectedBenefit}`);
  writeLine(`Fecha Jubilación: ${result.retirementDate}`);
  writeLine(`n=${result.counts.n} cs=${result.counts.spouses} hs=${result.counts.children}`);
  writeLine(`xmin=${result.trace.xmin} tMax=${result.trace.tMax}`);
  writeLine(`Versión técnica: 2025`);

  return doc.save();
}
