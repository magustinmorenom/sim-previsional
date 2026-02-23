import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import { Breadcrumbs } from "@/app/_anexo/breadcrumbs";
import { ContentTransition } from "@/app/_anexo/content-transition";
import { NavigationLoadingOverlay } from "@/app/_anexo/navigation-loading-overlay";
import { SessionChipline } from "@/app/_anexo/session-chipline";
import { TopNav } from "@/app/_anexo/top-nav";
import { WorkspaceWithChat } from "@/app/_anexo/workspace-with-chat";
import { getNavigationModules } from "@/lib/config/module-access";
import { getAuthSessionCookieName, parseAuthSessionCookieValue } from "@/lib/server/session";

export async function AnexoLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(getAuthSessionCookieName())?.value;
  const session = parseAuthSessionCookieValue(sessionCookieValue);
  const hasSession = Boolean(session);
  const modules = getNavigationModules();

  return (
    <div className="anx-shell">
      <header className="anx-header">
        <div className="anx-brand">
          <a href="https://cajaceer.org.ar" className="anx-brand-link" aria-label="Ir al sitio de CPS">
            <Image
              src="/cps-logo.svg"
              alt="CPS"
              width={56}
              height={56}
              priority
              className="anx-brand-logo"
            />
          </a>
        </div>

        <div className="anx-header-nav">
          <TopNav modules={modules} hasSession={hasSession} className="anx-topnav-inline" />
        </div>
      </header>

      <div className="anx-breadcrumb-row">
        <Breadcrumbs />
        <SessionChipline
          authenticated={hasSession}
          fullName={session?.fullName}
          email={session?.email}
          fileNumber={session?.fileNumber}
        />
      </div>
      <WorkspaceWithChat>
        <ContentTransition>{children}</ContentTransition>
      </WorkspaceWithChat>
      <NavigationLoadingOverlay />
    </div>
  );
}
