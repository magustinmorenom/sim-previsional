import { ModuleIcon } from "@/app/_anexo/module-icons";

export default function TramitesPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Trámites</h1>
      </article>

      <section className="anx-module-grid">
        <article className="anx-module-card anx-panel" style={{ opacity: 0.65, pointerEvents: "none" }}>
          <div className="anx-module-card-top">
            <div className="anx-module-title-wrap">
              <ModuleIcon moduleKey="comunidad-vinculada" className="anx-module-card-icon" />
              <h2>Comunidad Vinculada</h2>
            </div>
            <span className="anx-badge">Proximamente</span>
          </div>
          <p>Gestión de aportes a través de Comunidad Vinculada.</p>
        </article>
      </section>
    </section>
  );
}
