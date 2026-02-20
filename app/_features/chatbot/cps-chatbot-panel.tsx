"use client";

import { useEffect, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  persist: boolean;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "Hola, soy CPS Bot. Preguntame sobre normativa, procesos o documentos disponibles.",
  persist: false
};

const SUGGESTED_PROMPTS = [
  "¿Qué documentación necesito para iniciar mi trámite previsional?",
  "¿Dónde puedo consultar la normativa vigente?",
  "¿Qué canales de contacto tiene la plataforma?"
] as const;

function buildMessage(role: ChatRole, content: string, persist = true): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content,
    persist
  };
}

function getErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const candidate = payload.error;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return "No fue posible obtener respuesta del asistente.";
}

export function CpsChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, loading]);

  async function sendMessage(rawContent: string): Promise<void> {
    const content = rawContent.trim();
    if (!content || loading) {
      return;
    }

    const userMessage = buildMessage("user", content);
    const requestHistory = messages
      .filter((item) => item.persist)
      .slice(-12)
      .map((item) => ({
        role: item.role,
        content: item.content
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/v1/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content,
          history: requestHistory
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        const apiError = getErrorMessage(payload);
        setError(apiError);
        setMessages((prev) => [
          ...prev,
          buildMessage("assistant", "No tengo información disponible para responder esta consulta.")
        ]);
        return;
      }

      const reply = typeof payload.reply === "string" ? payload.reply.trim() : "";
      if (!reply) {
        throw new Error("Respuesta vacía del asistente.");
      }

      setMessages((prev) => [...prev, buildMessage("assistant", reply)]);
    } catch {
      setError("No fue posible conectar con el asistente en este momento.");
      setMessages((prev) => [
        ...prev,
        buildMessage("assistant", "No tengo información disponible para responder esta consulta.")
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <article className="anx-panel anx-chat-shell">
      <header className="anx-chat-head">
        <div>
          <h2>CPS Bot</h2>
          <p>Respuestas basadas en documentos indexados.</p>
        </div>
        <span className="anx-chat-pill">Base documental</span>
      </header>

      <div className="anx-chat-prompts">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="anx-chat-prompt"
            onClick={() => {
              void sendMessage(prompt);
            }}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="anx-chat-window" ref={viewportRef} aria-live="polite">
        {messages.map((message, index) => (
          <article
            key={message.id}
            className={`anx-chat-bubble anx-chat-bubble-${message.role}`}
            style={{ animationDelay: `${Math.min(index * 45, 260)}ms` }}
          >
            <small className="anx-chat-bubble-role">
              {message.role === "assistant" ? "CPS Bot" : "Vos"}
            </small>
            <p className="anx-chat-bubble-text">{message.content}</p>
          </article>
        ))}

        {loading && (
          <div className="anx-chat-typing" aria-label="CPS Bot está escribiendo">
            <small>CPS Bot está escribiendo</small>
            <div className="anx-chat-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {error && <p className="anx-status anx-status-error">{error}</p>}

      <form className="anx-chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="cps-chat-input">Mensaje para CPS Bot</label>
        <input
          id="cps-chat-input"
          className="anx-chat-input"
          type="text"
          placeholder="Escribí tu consulta..."
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="anx-chat-send"
          disabled={loading || input.trim().length === 0}
        >
          {loading ? "Pensando..." : "Enviar"}
        </button>
      </form>
    </article>
  );
}
