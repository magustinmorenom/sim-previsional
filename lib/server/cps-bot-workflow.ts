import {
  Agent,
  type AgentInputItem,
  Runner,
  fileSearchTool,
  withTrace
} from "@openai/agents";

const DEFAULT_VECTOR_STORE_ID = "vs_69989af792608191982c3a294ff61988";
const DEFAULT_MODEL = "gpt-5.2";
const TRACE_WORKFLOW_ID = "wf_69989af941488190ade1e7b959ed02630dab20f99419028c";

export type ChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type WorkflowInput = {
  input_as_text: string;
  history?: ChatHistoryEntry[];
};

function resolveVectorStoreIds(): string[] {
  const configuredIds = process.env.OPENAI_CPS_VECTOR_STORE_IDS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredIds && configuredIds.length > 0) {
    return configuredIds;
  }

  return [DEFAULT_VECTOR_STORE_ID];
}

function mapHistoryEntryToAgentInput(entry: ChatHistoryEntry): AgentInputItem {
  if (entry.role === "assistant") {
    return {
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text: entry.content }]
    };
  }

  return {
    role: "user",
    content: [{ type: "input_text", text: entry.content }]
  };
}

const fileSearch = fileSearchTool(resolveVectorStoreIds());

const cpsBot = new Agent({
  name: "CPS Bot",
  instructions: `Eres un asistente que responde usando la información de los documentos disponibles.

Siempre busca en la base de conocimiento antes de responder.

Si no encuentras la respuesta en los documentos, di claramente que no tienes información.

Responde de forma clara y concisa.`,
  model: process.env.OPENAI_CPS_MODEL?.trim() || DEFAULT_MODEL,
  tools: [fileSearch],
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

export async function runWorkflow(workflow: WorkflowInput): Promise<{ output_text: string }> {
  return withTrace("CPS-Bot", async () => {
    const conversationHistory: AgentInputItem[] = [
      ...(workflow.history ?? []).map(mapHistoryEntryToAgentInput),
      {
        role: "user",
        content: [{ type: "input_text", text: workflow.input_as_text }]
      }
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: TRACE_WORKFLOW_ID
      }
    });

    const cpsBotResult = await runner.run(cpsBot, conversationHistory);

    if (typeof cpsBotResult.finalOutput !== "string" || cpsBotResult.finalOutput.trim().length === 0) {
      throw new Error("Agent result is undefined");
    }

    return {
      output_text: cpsBotResult.finalOutput
    };
  });
}
