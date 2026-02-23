import { ModuleIcon } from "@/app/_anexo/module-icons";

export default function TramitesPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Trámites</h1>
      </article>

      <section className="anx-module-grid">
        <article className="anx-module-card anx-panel">
          <div className="anx-module-card-top">
            <div className="anx-module-title-wrap">
              <ModuleIcon moduleKey="tramites" className="anx-module-card-icon" />
              <h2>BEP Personería Jurídica</h2>
            </div>
          </div>
          <p>Generación de BEP para aportes a través de Comunidad Vinculada - Personería Jurídica.</p>
          <span className="anx-module-cta">Ver trámite</span>
        </article>
      </section>
    </section>
  );
}
