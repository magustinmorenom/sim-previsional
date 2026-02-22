import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/app/_anexo/breadcrumbs";
import { ContentTransition } from "@/app/_anexo/content-transition";
import { NavigationLoadingOverlay } from "@/app/_anexo/navigation-loading-overlay";
import { TopNav } from "@/app/_anexo/top-nav";
import { WorkspaceWithChat } from "@/app/_anexo/workspace-with-chat";
import { getNavigationModules } from "@/lib/config/module-access";
import { getAuthSessionCookieName, parseAuthSessionCookieValue } from "@/lib/server/session";

export async function AnexoLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(getAuthSessionCookieName())?.value;
  const hasSession = Boolean(parseAuthSessionCookieValue(sessionCookieValue));
  const modules = getNavigationModules();

  return (
    <div className="anx-shell">
      <header className="anx-header">
        <div className="anx-brand">
          <Link href="/app" className="anx-brand-link" aria-label="Inicio">
            <Image
              src="/cps-logo.svg"
              alt="CPS"
              width={56}
              height={56}
              priority
              className="anx-brand-logo"
            />
          </Link>
        </div>

        <div className="anx-header-nav">
          <TopNav modules={modules} hasSession={hasSession} className="anx-topnav-inline" />
          {hasSession && (
            <div className="anx-session-pill" aria-live="polite">
              Sesión activa
            </div>
          )}
        </div>
      </header>

      <Breadcrumbs />
      <WorkspaceWithChat>
        <ContentTransition>{children}</ContentTransition>
      </WorkspaceWithChat>
      <NavigationLoadingOverlay />
    </div>
  );
}
