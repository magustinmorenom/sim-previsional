import Link from "next/link";

export default function SimuladoresIndexPage() {
  return (
    <section className="anx-stack">
      <article className="anx-panel anx-section-header">
        <h1>Subapps de simulación</h1>
        <p>Seleccioná la simulación a utilizar. Ambos módulos requieren acceso autenticado.</p>
      </article>

      <div className="anx-module-grid">
        <Link href="/app/simuladores/previsional" className="anx-module-card anx-panel">
          <div className="anx-module-card-top">
            <h2>Simulación previsional</h2>
            <span className="anx-badge">Privado</span>
          </div>
          <p>Versión actual integrada con OTP, contexto afiliado y cálculo actuarial.</p>
          <span className="anx-module-cta">Entrar</span>
        </Link>

        <Link href="/app/simuladores/prestamos" className="anx-module-card anx-panel">
          <div className="anx-module-card-top">
            <h2>Simulación de préstamos</h2>
            <span className="anx-badge">Privado</span>
          </div>
          <p>Espacio reservado para el simulador nativo con catálogo y tasas públicas.</p>
          <span className="anx-module-cta">Entrar</span>
        </Link>
      </div>
    </section>
  );
}
