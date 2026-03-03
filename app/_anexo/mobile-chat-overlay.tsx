"use client";

import { CpsChatbotPanel } from "@/app/_features/chatbot/cps-chatbot-panel";

interface MobileChatOverlayProps {
  onClose: () => void;
}

export function MobileChatOverlay({ onClose }: MobileChatOverlayProps) {
  return (
    <div className="mob-chat-overlay">
      <header className="mob-chat-overlay-header">
        <h2 className="mob-chat-overlay-title">IA CPS</h2>
        <button
          type="button"
          className="mob-chat-overlay-close"
          onClick={onClose}
          aria-label="Cerrar asistente"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </header>
      <div className="mob-chat-overlay-body">
        <CpsChatbotPanel active />
      </div>
    </div>
  );
}
