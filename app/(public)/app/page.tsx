import Link from "next/link";
import { cookies } from "next/headers";
import { getNavigationModules } from "@/lib/config/module-access";

const DEFAULT_SESSION_COOKIE_NAME = "sp_session";

function getSessionCookieName(): string {
  return process.env.AUTH_SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

export default async function AppHomePage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(getSessionCookieName())?.value);
  const modules = getNavigationModules().filter((module) => module.key !== "home");

  return (
    <section className="anx-grid">
      <article className="anx-hero-card anx-panel">
        <h1>App de servicios para afiliados</h1>
        <p>
          Esta experiencia concentra trámites, documentos, procesos y simulaciones en una interfaz simple.
          Blog, novedades y misión institucional quedan en WordPress.
        </p>
        <div className="anx-hero-tags">
          <span>Biblioteca única</span>
          <span>Procesos guiados</span>
          <span>Subapps de simulación</span>
        </div>
      </article>

      <section className="anx-module-grid">
        {modules.map((module) => {
          const isPrivate = module.visibility === "private";
          const href = isPrivate && !hasSession
            ? `/app/acceso?next=${encodeURIComponent(module.path)}`
            : module.path;

          return (
            <Link key={module.key} href={href} className="anx-module-card anx-panel">
              <div className="anx-module-card-top">
                <h2>{module.title}</h2>
                {module.badge && <span className="anx-badge">{module.badge}</span>}
              </div>
              <p>{module.description}</p>
              <span className="anx-module-cta">Abrir módulo</span>
            </Link>
          );
        })}
      </section>
    </section>
  );
}
