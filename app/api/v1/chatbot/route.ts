import { NextResponse } from "next/server";
import { z } from "zod";
import { runWorkflow, type ChatHistoryEntry } from "@/lib/server/cps-bot-workflow";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000)
      })
    )
    .max(20)
    .optional()
    .default([])
});

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function toHistoryEntries(value: ReadonlyArray<{ role: "user" | "assistant"; content: string }>): ChatHistoryEntry[] {
  return value.map((item) => ({
    role: item.role,
    content: item.content
  }));
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasOpenAiKey()) {
    return NextResponse.json(
      {
        success: false,
        error: "OPENAI_API_KEY no está configurada en el entorno."
      },
      { status: 503 }
    );
  }

  try {
    const payload = await request.json();
    const parsedPayload = chatRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload inválido para el chatbot.",
          details: parsedPayload.error.flatten()
        },
        { status: 400 }
      );
    }

    const result = await runWorkflow({
      input_as_text: parsedPayload.data.message,
      history: toHistoryEntries(parsedPayload.data.history)
    });

    return NextResponse.json(
      {
        success: true,
        reply: result.output_text
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error no controlado";

    return NextResponse.json(
      {
        success: false,
        error: "No fue posible completar la consulta del chatbot.",
        details: message
      },
      { status: 500 }
    );
  }
}
