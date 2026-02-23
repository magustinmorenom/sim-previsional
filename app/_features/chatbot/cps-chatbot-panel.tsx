"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  persist: boolean;
};

interface CpsChatbotPanelProps {
  className?: string;
  active?: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "Hola, soy IA CPS. Te ayudo con procesos, documentación y consultas frecuentes.",
  persist: false
};

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

export function CpsChatbotPanel({ className, active = true }: CpsChatbotPanelProps = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const firstRenderRef = useRef(true);

  function scrollToBottom(behavior: ScrollBehavior): void {
    if (!viewportRef.current) {
      return;
    }

    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior
    });
  }

  const focusInput = useCallback((): void => {
    if (!active || loading || !inputRef.current) {
      return;
    }

    if (document.activeElement !== inputRef.current) {
      inputRef.current.focus({
        preventScroll: true
      });
    }
  }, [active, loading]);

  const persistableMessages = useMemo(
    () => messages.filter((item) => item.persist).map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      scrollToBottom("auto");
      return;
    }

    scrollToBottom("smooth");
  }, [messages, loading]);

  useEffect(() => {
    focusInput();
  }, [focusInput, messages.length]);

  async function sendMessage(rawContent: string): Promise<void> {
    const content = rawContent.trim();
    if (!content || loading) {
      return;
    }

    const userMessage = buildMessage("user", content);
    const requestHistory = persistableMessages
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.content }));

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

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleInputBlur(): void {
    if (!active || loading) {
      return;
    }

    requestAnimationFrame(() => {
      focusInput();
    });
  }

  const shellClassName = className ? `anx-chat-shell ${className}` : "anx-chat-shell";

  return (
    <article className={shellClassName}>
      <header className="anx-chat-head">
        <div className="anx-chat-head-main">
          <h2>
            <span className="anx-chat-title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 10 7.5 5.5 9.5 10 11.5 12 16l2-4.5 4.5-2-4.5-2L12 3Z" />
                <path d="M4.5 15.5 5.3 17.2 7 18l-1.7.8-.8 1.7-.8-1.7L2 18l1.7-.8.8-1.7Z" />
              </svg>
            </span>
            IA CPS
          </h2>
          <p>Pregúntale a nuestro agente IA cualquier duda que tengas</p>
        </div>
      </header>

      <div className="anx-chat-window" ref={viewportRef} aria-live="polite">
        {messages.map((message, index) => (
          <article
            key={message.id}
            className={`anx-chat-bubble anx-chat-bubble-${message.role}`}
            style={{ animationDelay: `${Math.min(index * 45, 260)}ms` }}
          >
            <small className="anx-chat-bubble-role">
              {message.role === "assistant" ? "IA CPS" : "Vos"}
            </small>
            <div className="anx-chat-bubble-text anx-chat-markdown">
              {renderMarkdown(message.content)}
            </div>
          </article>
        ))}

        {loading && (
          <div className="anx-chat-typing" aria-label="IA CPS está escribiendo">
            <small>IA CPS está escribiendo</small>
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
        <label className="sr-only" htmlFor="cps-chat-input">Mensaje para IA CPS</label>
        <input
          id="cps-chat-input"
          ref={inputRef}
          className="anx-chat-input"
          type="text"
          placeholder="Escribí tu consulta..."
          autoComplete="off"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onBlur={handleInputBlur}
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

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

function renderMarkdown(content: string): ReactNode {
  const blocks = parseMarkdownBlocks(content);

  return blocks.map((block, blockIndex) => {
    if (block.type === "paragraph") {
      return (
        <p key={`md-paragraph-${blockIndex}`}>
          {renderInlineMarkdown(block.lines.join(" "))}
        </p>
      );
    }

    if (block.type === "unordered-list") {
      return (
        <ul key={`md-ul-${blockIndex}`}>
          {block.items.map((item, itemIndex) => (
            <li key={`md-ul-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <ol key={`md-ol-${blockIndex}`}>
        {block.items.map((item, itemIndex) => (
          <li key={`md-ol-item-${blockIndex}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ol>
    );
  });
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];

  let paragraphLines: string[] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push({
      type: "paragraph",
      lines: paragraphLines
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }
    blocks.push({
      type: listType,
      items: listItems
    });
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(line);
    if (unorderedMatch) {
      flushParagraph();
      if (listType !== "unordered-list") {
        flushList();
        listType = "unordered-list";
      }
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== "ordered-list") {
        flushList();
        listType = "ordered-list";
      }
      listItems.push(orderedMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInlineMarkdown(value: string): ReactNode {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(([^)\s]+)\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(value.slice(cursor, start));
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`md-strong-${matchIndex}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={`md-em-${matchIndex}`}>
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`md-code-${matchIndex}`}>
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={`md-link-${matchIndex}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    cursor = start + token.length;
    matchIndex += 1;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}
