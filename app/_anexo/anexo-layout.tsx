import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { getNavigationModules } from "@/lib/config/module-access";
import { Breadcrumbs } from "@/app/_anexo/breadcrumbs";
import { TopNav } from "@/app/_anexo/top-nav";

const DEFAULT_SESSION_COOKIE_NAME = "sp_session";

function getSessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

export async function AnexoLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(getSessionCookieName())?.value);
  const modules = getNavigationModules();

  return (
    <div className="anx-shell">
      <header className="anx-header">
        <div className="anx-brand">
          <p className="anx-kicker">Sistema de Previsión Social</p>
          <Link href="/app" className="anx-brand-link">
            Plataforma de Servicios
          </Link>
          <p className="anx-subtitle">
            Anexo operativo con simulaciones, documentación, procesos y consultas.
          </p>
        </div>
        <div className="anx-session-pill" aria-live="polite">
          {hasSession ? "Sesión activa" : "Sesión no iniciada"}
        </div>
      </header>

      <TopNav modules={modules} hasSession={hasSession} />
      <Breadcrumbs />

      <section className="anx-content">{children}</section>
    </div>
  );
}
