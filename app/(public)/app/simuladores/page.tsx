import Link from "next/link";
import { ModuleIcon } from "@/app/_anexo/module-icons";

export default function SimuladoresIndexPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Subapps de simulación</h1>
      </article>

      <div className="anx-module-grid">
        <Link
          href="/app/simuladores/previsional"
          className="anx-module-card anx-panel anx-module-card-simulator"
        >
          <div className="anx-module-card-top">
            <div className="anx-module-title-wrap">
              <ModuleIcon moduleKey="simulador-previsional" className="anx-module-card-icon" />
              <h2>Simulación previsional</h2>
            </div>
            <span className="anx-badge">Privado</span>
          </div>
          <span className="anx-module-cta">Entrar</span>
        </Link>

        <Link
          href="/app/simuladores/prestamos"
          className="anx-module-card anx-panel anx-module-card-simulator"
        >
          <div className="anx-module-card-top">
            <div className="anx-module-title-wrap">
              <ModuleIcon moduleKey="simulador-prestamos" className="anx-module-card-icon" />
              <h2>Simulación de préstamos</h2>
            </div>
            <span className="anx-badge">Privado</span>
          </div>
          <span className="anx-module-cta">Entrar</span>
        </Link>
      </div>
    </section>
  );
}
