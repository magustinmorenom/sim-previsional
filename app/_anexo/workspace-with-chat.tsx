"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CpsChatbotPanel } from "@/app/_features/chatbot/cps-chatbot-panel";

const CHAT_OPEN_STORAGE_KEY = "anx-chat-open";
const DESKTOP_BREAKPOINT = 981;

interface WorkspaceWithChatProps {
  children: ReactNode;
}

function readSavedOpenState(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const savedValue = window.localStorage.getItem(CHAT_OPEN_STORAGE_KEY);
  if (savedValue === null) {
    return true;
  }

  return savedValue === "1";
}

export function WorkspaceWithChat({ children }: WorkspaceWithChatProps) {
  const [chatOpen, setChatOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(window.innerWidth < DESKTOP_BREAKPOINT);
    };

    updateViewportMode();
    setChatOpen(readSavedOpenState());

    window.addEventListener("resize", updateViewportMode);
    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_OPEN_STORAGE_KEY, chatOpen ? "1" : "0");
  }, [chatOpen]);

  const workspaceStyle = useMemo(() => {
    return {
      "--anx-chat-width": chatOpen ? "35%" : "72px"
    } as CSSProperties;
  }, [chatOpen]);

  return (
    <div
      className={`anx-workspace-with-chat ${chatOpen ? "anx-workspace-with-chat-open" : ""} ${isMobile ? "anx-workspace-with-chat-mobile" : ""}`}
      style={workspaceStyle}
    >
      <main className="anx-workspace-main">{children}</main>

      <aside className={`anx-workspace-chat ${chatOpen ? "anx-workspace-chat-open" : ""}`} aria-label="Asistente IA">
        <div className={`anx-chat-dock ${chatOpen ? "anx-chat-dock-open" : ""}`}>
          <button
            type="button"
            className="anx-chat-toggle"
            aria-expanded={chatOpen}
            aria-label={chatOpen ? "Ocultar asistente IA" : "Mostrar asistente IA"}
            onClick={() => setChatOpen((current) => !current)}
          >
            <span className="anx-chat-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 9.8 8.2 4.5 10.5 9.8 12.8 12 18l2.2-5.2 5.3-2.3-5.3-2.3L12 3Z" />
                <path d="M4 17.5 5 20l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
              </svg>
            </span>
          </button>

          <div className="anx-workspace-chat-body">
            <CpsChatbotPanel className="anx-chat-shell-embedded" />
          </div>
        </div>
      </aside>
    </div>
  );
}
