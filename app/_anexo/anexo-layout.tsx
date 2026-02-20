import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/app/_anexo/breadcrumbs";
import { ContentTransition } from "@/app/_anexo/content-transition";
import { TopNav } from "@/app/_anexo/top-nav";
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
          <Link href="/app" className="anx-brand-link" aria-label="Plataforma de Servicios">
            <Image
              src="/cps-logo.svg"
              alt="CPS"
              width={56}
              height={56}
              priority
              className="anx-brand-logo"
            />
            <span>Plataforma de Servicios</span>
          </Link>
        </div>

        <div className="anx-session-pill" aria-live="polite">
          {hasSession ? "Sesión activa" : "Sesión no iniciada"}
        </div>
      </header>

      <TopNav modules={modules} hasSession={hasSession} />
      <Breadcrumbs />
      <ContentTransition>{children}</ContentTransition>
    </div>
  );
}
