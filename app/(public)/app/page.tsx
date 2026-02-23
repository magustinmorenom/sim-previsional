import Link from "next/link";
import { cookies } from "next/headers";
import { ModuleIcon } from "@/app/_anexo/module-icons";
import { getNavigationModules } from "@/lib/config/module-access";
import { getAuthSessionCookieName, parseAuthSessionCookieValue } from "@/lib/server/session";

export default async function AppHomePage() {
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(getAuthSessionCookieName())?.value;
  const hasSession = Boolean(parseAuthSessionCookieValue(sessionCookieValue));
  const modules = getNavigationModules().filter((module) => module.key !== "home");

  return (
    <section className="anx-grid">
      <section className="anx-module-grid">
        {modules.map((module) => {
          const isPrivate = module.visibility === "private";
          const href = isPrivate && !hasSession
            ? `/app/acceso?next=${encodeURIComponent(module.path)}`
            : module.path;
          const simulatorClass = module.key.startsWith("simulador-") ? "anx-module-card-simulator" : "";

          return (
            <Link key={module.key} href={href} prefetch className={`anx-module-card anx-panel ${simulatorClass}`.trim()}>
              <div className="anx-module-card-top">
                <div className="anx-module-title-wrap">
                  <ModuleIcon moduleKey={module.key} className="anx-module-card-icon" />
                  <h2>{module.title}</h2>
                </div>
                {module.badge && module.badge.toLowerCase() !== "privado" && (
                  <span className="anx-badge">{module.badge}</span>
                )}
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
