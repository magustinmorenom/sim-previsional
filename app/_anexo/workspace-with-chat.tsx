"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CpsChatbotPanel } from "@/app/_features/chatbot/cps-chatbot-panel";

const CHAT_OPEN_STORAGE_KEY = "anx-chat-open";
const CHAT_OPEN_EVENT = "anx:chat-open";
const DESKTOP_BREAKPOINT = 981;

interface WorkspaceWithChatProps {
  children: ReactNode;
}

function readSavedOpenState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const savedValue = window.localStorage.getItem(CHAT_OPEN_STORAGE_KEY);
  if (savedValue === null) {
    return false;
  }

  return savedValue === "1";
}

export function WorkspaceWithChat({ children }: WorkspaceWithChatProps) {
  const [chatOpen, setChatOpen] = useState<boolean>(readSavedOpenState);
  const [isMobile, setIsMobile] = useState(false);
  const [chatOpenHeight, setChatOpenHeight] = useState<number | null>(null);
  const chatDockRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const openChatFromEvent = () => {
      setChatOpen((current) => {
        if (current) {
          return current;
        }

        window.localStorage.setItem(CHAT_OPEN_STORAGE_KEY, "1");
        return true;
      });
    };

    window.addEventListener(CHAT_OPEN_EVENT, openChatFromEvent);
    return () => {
      window.removeEventListener(CHAT_OPEN_EVENT, openChatFromEvent);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isMobile || !chatOpen) {
      return;
    }

    let rafId = 0;

    const syncChatHeight = () => {
      const dock = chatDockRef.current;
      if (!dock) {
        return;
      }

      const dockTop = Math.max(0, dock.getBoundingClientRect().top);
      const nextHeight = Math.max(72, Math.floor(window.innerHeight - dockTop));
      setChatOpenHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    const requestSync = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncChatHeight);
    };

    requestSync();
    window.addEventListener("resize", requestSync);
    window.addEventListener("scroll", requestSync, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", requestSync);
      window.removeEventListener("scroll", requestSync);
    };
  }, [chatOpen, isMobile]);

  const workspaceStyle = useMemo(() => {
    const style = {
      "--anx-chat-width": chatOpen ? "30%" : "72px"
    } as Record<string, string>;

    if (chatOpenHeight) {
      style["--anx-chat-open-height"] = `${chatOpenHeight}px`;
    }

    return style as CSSProperties;
  }, [chatOpen, chatOpenHeight]);

  const toggleChat = () => {
    setChatOpen((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAT_OPEN_STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  return (
    <div
      className={`anx-workspace-with-chat ${chatOpen ? "anx-workspace-with-chat-open" : ""} ${isMobile ? "anx-workspace-with-chat-mobile" : ""}`}
      style={workspaceStyle}
    >
      <main className="anx-workspace-main">{children}</main>

      <aside className={`anx-workspace-chat ${chatOpen ? "anx-workspace-chat-open" : ""}`} aria-label="Asistente IA">
        <div ref={chatDockRef} className={`anx-chat-dock ${chatOpen ? "anx-chat-dock-open" : ""}`}>
          <button
            type="button"
            className="anx-chat-toggle"
            aria-expanded={chatOpen}
            aria-label={chatOpen ? "Ocultar asistente IA" : "Mostrar asistente IA"}
            onClick={toggleChat}
          >
            <span className="anx-chat-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 9.8 8.2 4.5 10.5 9.8 12.8 12 18l2.2-5.2 5.3-2.3-5.3-2.3L12 3Z" />
                <path d="M4 17.5 5 20l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
              </svg>
            </span>
          </button>

          <div className="anx-workspace-chat-body">
            <CpsChatbotPanel className="anx-chat-shell-embedded" active={chatOpen} />
          </div>
        </div>
      </aside>
    </div>
  );
}
