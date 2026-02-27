import Link from "next/link";
import type { JSX } from "react";
import PrestamosSimulatorSwitcher from "@/sim-guion-prestamos/src/ui/prestamos-simulator-switcher";

type PrestamosSimulatorMode = "api" | "isolated";

function isPrestamosUiV2Enabled(): boolean {
  const raw = process.env.ENABLE_PRESTAMOS_UI_V2?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function getPrestamosSimulatorMode(): PrestamosSimulatorMode {
  const raw = process.env.PRESTAMOS_SIMULATOR_MODE?.trim().toLowerCase();
  return raw === "isolated" ? "isolated" : "api";
}

export default function SimuladorPrestamosPage(): JSX.Element {
  if (!isPrestamosUiV2Enabled()) {
    return (
      <section className="anx-stack">
        <article className="anx-panel anx-section-header">
          <h1>Simulador de préstamos</h1>
          <p>
            La nueva interfaz está preparada pero aún no fue habilitada por configuración.
            Activá <code>ENABLE_PRESTAMOS_UI_V2=true</code> para usarla.
          </p>
        </article>

        <article className="anx-panel anx-placeholder-card">
          <h2>Modo transición</h2>
          <p>
            Mientras tanto podés revisar requisitos, formularios y tasas desde biblioteca.
          </p>
          <Link className="anx-link-btn" href="/app/biblioteca">
            Abrir biblioteca
          </Link>
        </article>
      </section>
    );
  }

  return <PrestamosSimulatorSwitcher defaultMode={getPrestamosSimulatorMode()} />;
}
