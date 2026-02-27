"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import PrestamosSimulatorPage from "@/sim-guion-prestamos/src/ui/prestamos-simulator-page";
import PrestamosIsolatedSimulatorPage from "@/sim-guion-prestamos/src/ui/prestamos-isolated-simulator-page";
import styles from "@/sim-guion-prestamos/src/ui/prestamos-simulator.module.css";

export type PrestamosSimulatorMode = "api" | "isolated";

const MODE_STORAGE_KEY = "cps-prestamos-simulator-mode";

function isMode(value: string | null): value is PrestamosSimulatorMode {
  return value === "api" || value === "isolated";
}

interface PrestamosSimulatorSwitcherProps {
  defaultMode: PrestamosSimulatorMode;
}

export default function PrestamosSimulatorSwitcher({ defaultMode }: PrestamosSimulatorSwitcherProps): JSX.Element {
  const [mode, setMode] = useState<PrestamosSimulatorMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (isMode(storedMode)) {
      setMode(storedMode);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [hydrated, mode]);

  return (
    <div className={styles.switcherStack}>
      <article className={`anx-panel ${styles.modeSwitchCard}`}>
        <div className={styles.modeSwitchHead}>
          <h2>Modo de simulador</h2>
          <span className={styles.modeSwitchHint}>Podés alternar sin reiniciar la app</span>
        </div>

        <div className={styles.modeSwitchActions}>
          <button
            type="button"
            className={`${styles.modeSwitchButton} ${mode === "api" ? styles.modeSwitchButtonActive : ""}`}
            onClick={() => setMode("api")}
          >
            API conectada
          </button>

          <button
            type="button"
            className={`${styles.modeSwitchButton} ${mode === "isolated" ? styles.modeSwitchButtonActive : ""}`}
            onClick={() => setMode("isolated")}
          >
            Isolated (catálogo local)
          </button>
        </div>
      </article>

      {mode === "api" ? <PrestamosSimulatorPage /> : <PrestamosIsolatedSimulatorPage />}
    </div>
  );
}
