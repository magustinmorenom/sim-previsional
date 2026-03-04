"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ContentTransition } from "@/app/_anexo/content-transition";
import { MobileBottomBar } from "@/app/_anexo/mobile-bottom-bar";
import { MobileChatOverlay } from "@/app/_anexo/mobile-chat-overlay";
import { MobileDrawer } from "@/app/_anexo/mobile-drawer";
import { MobileHeader } from "@/app/_anexo/mobile-header";
import { NavigationLoadingOverlay } from "@/app/_anexo/navigation-loading-overlay";
import type { ModuleDescriptor } from "@/lib/types/content";

interface MobileShellProps {
  modules: ModuleDescriptor[];
  hasSession: boolean;
  session: { fullName?: string | null; email?: string | null; fileNumber?: string | null } | null;
  children: ReactNode;
}

const CHAT_OPEN_EVENT = "anx:chat-open";

export function MobileShell({ modules, hasSession, session, children }: MobileShellProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener(CHAT_OPEN_EVENT, handler);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, handler);
  }, []);

  return (
    <div className="mob-shell">
      <MobileHeader onOpenChat={() => setChatOpen(true)} />

      <div className="mob-content">
        <ContentTransition>{children}</ContentTransition>
      </div>

      <MobileBottomBar
        hasSession={hasSession}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {drawerOpen && (
        <MobileDrawer
          modules={modules}
          hasSession={hasSession}
          session={session}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {chatOpen && (
        <MobileChatOverlay onClose={() => setChatOpen(false)} />
      )}

      <NavigationLoadingOverlay />
    </div>
  );
}
