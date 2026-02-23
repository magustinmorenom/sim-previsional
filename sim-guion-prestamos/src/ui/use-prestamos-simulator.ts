"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PrestamosFormState,
  PrestamosFormValidation,
  ScenarioSnapshot
} from "@/sim-guion-prestamos/src/domain/contracts";
import type {
  PrestamoLinea,
  PrestamosSimularRequest,
  PrestamosSimularResponse
} from "@/lib/types/prestamos-public";
import { parseLocaleNumber } from "@/sim-guion-prestamos/src/domain/formatters";

const DEFAULT_MONTO_SUGERIDO = 500000;
const MAX_SCENARIOS = 3;

function readApiMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) {
      return error.message;
    }
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
}

function buildInitialForm(linea: PrestamoLinea | null): PrestamosFormState {
  if (!linea) {
    return {
      lineaPrestamoId: 0,
      montoOtorgado: "",
      cantidadCuotas: ""
    };
  }

  const montoBase = Math.max(linea.montoMinimo, DEFAULT_MONTO_SUGERIDO);
  const cuotasBase = Math.min(12, linea.maxCuotas);

  return {
    lineaPrestamoId: linea.id,
    montoOtorgado: String(Math.floor(montoBase)),
    cantidadCuotas: String(cuotasBase)
  };
}

function validateForm(form: PrestamosFormState, selectedLinea: PrestamoLinea | null): PrestamosFormValidation {
  const errors: PrestamosFormValidation = {};

  if (!selectedLinea) {
    errors.montoOtorgado = "Seleccioná una línea de préstamo.";
    return errors;
  }

  const monto = parseLocaleNumber(form.montoOtorgado);
  if (!Number.isFinite(monto)) {
    errors.montoOtorgado = "Ingresá un monto válido.";
  } else if (monto < selectedLinea.montoMinimo || monto > selectedLinea.montoMaximo) {
    errors.montoOtorgado = `El monto debe estar entre ${selectedLinea.montoMinimo} y ${selectedLinea.montoMaximo}.`;
  }

  const cuotas = Number(form.cantidadCuotas);
  if (!Number.isFinite(cuotas)) {
    errors.cantidadCuotas = "Ingresá una cantidad de cuotas válida.";
  } else if (cuotas < 1 || cuotas > selectedLinea.maxCuotas) {
    errors.cantidadCuotas = `La línea permite entre 1 y ${selectedLinea.maxCuotas} cuotas.`;
  }

  return errors;
}

function normalizeLineas(payload: unknown): PrestamoLinea[] | null {
  if (Array.isArray(payload)) {
    return payload as PrestamoLinea[];
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as PrestamoLinea[];
    }
  }

  return null;
}

function normalizeSimulation(payload: unknown): PrestamosSimularResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybe = payload as {
    linea?: unknown;
    tasa?: unknown;
    costosIniciales?: unknown;
    amortizacion?: unknown;
  };

  if (!maybe.linea || !maybe.tasa || !maybe.costosIniciales || !maybe.amortizacion) {
    return null;
  }

  const amortizacion = maybe.amortizacion as { resumen?: unknown; cuadroDeMarcha?: unknown };
  if (!amortizacion.resumen || !Array.isArray(amortizacion.cuadroDeMarcha)) {
    return null;
  }

  return payload as PrestamosSimularResponse;
}

export function usePrestamosSimulator() {
  const [lineas, setLineas] = useState<PrestamoLinea[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [form, setForm] = useState<PrestamosFormState>({
    lineaPrestamoId: 0,
    montoOtorgado: "",
    cantidadCuotas: ""
  });

  const [simulation, setSimulation] = useState<PrestamosSimularResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [scenarios, setScenarios] = useState<ScenarioSnapshot[]>([]);

  useEffect(() => {
    void (async () => {
      setLoadingBootstrap(true);
      setBootstrapError(null);

      try {
        const response = await fetch("/api/v1/public/prestamos/lineas", { method: "GET" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(readApiMessage(payload, "No fue posible cargar líneas de préstamos."));
        }

        const normalized = normalizeLineas(payload);
        if (!normalized) {
          throw new Error("La API devolvió una lista de líneas inválida.");
        }

        setLineas(normalized);

        const firstLinea = normalized[0] ?? null;
        setForm(buildInitialForm(firstLinea));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible cargar simulador de préstamos.";
        setBootstrapError(message);
      } finally {
        setLoadingBootstrap(false);
      }
    })();
  }, []);

  const selectedLinea = useMemo(() => {
    if (lineas.length === 0) {
      return null;
    }

    return lineas.find((item) => item.id === form.lineaPrestamoId) ?? lineas[0] ?? null;
  }, [lineas, form.lineaPrestamoId]);

  useEffect(() => {
    if (!selectedLinea) {
      return;
    }

    setForm((prev) => {
      if (prev.lineaPrestamoId === selectedLinea.id) {
        return prev;
      }

      const nextForm = buildInitialForm(selectedLinea);
      return {
        ...prev,
        ...nextForm
      };
    });
  }, [selectedLinea]);

  const validation = useMemo(() => validateForm(form, selectedLinea), [form, selectedLinea]);

  const canSimulate =
    !loadingBootstrap &&
    !simulating &&
    selectedLinea !== null &&
    !validation.montoOtorgado &&
    !validation.cantidadCuotas;

  function updateLinea(lineaPrestamoId: number): void {
    const linea = lineas.find((item) => item.id === lineaPrestamoId) ?? null;
    if (!linea) {
      return;
    }

    setForm(buildInitialForm(linea));
    setSimulation(null);
    setSimulationError(null);
  }

  function updateMonto(value: string): void {
    setForm((prev) => ({
      ...prev,
      montoOtorgado: value
    }));
  }

  function updateCuotas(value: string): void {
    setForm((prev) => ({
      ...prev,
      cantidadCuotas: value
    }));
  }

  async function runSimulation(): Promise<void> {
    setSimulationError(null);

    if (!canSimulate || !selectedLinea) {
      return;
    }

    const request: PrestamosSimularRequest = {
      lineaPrestamoId: selectedLinea.id,
      montoOtorgado: parseLocaleNumber(form.montoOtorgado),
      cantidadCuotas: Number(form.cantidadCuotas),
      sistemaAmortizacion: selectedLinea.sistemaAmortizacion
    };

    setSimulating(true);

    try {
      const response = await fetch("/api/v1/public/prestamos/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(readApiMessage(payload, "No fue posible simular el préstamo."));
      }

      const normalized = normalizeSimulation(payload);
      if (!normalized) {
        throw new Error("La API devolvió una simulación inválida.");
      }

      setSimulation(normalized);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible simular el préstamo.";
      setSimulationError(message);
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  }

  function clearSimulation(): void {
    setSimulation(null);
    setSimulationError(null);
  }

  function saveCurrentScenario(): void {
    if (!selectedLinea || !simulation) {
      return;
    }

    const request: PrestamosSimularRequest = {
      lineaPrestamoId: selectedLinea.id,
      montoOtorgado: parseLocaleNumber(form.montoOtorgado),
      cantidadCuotas: Number(form.cantidadCuotas),
      sistemaAmortizacion: selectedLinea.sistemaAmortizacion
    };

    const snapshot: ScenarioSnapshot = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      titulo: `${selectedLinea.codigo} · ${request.cantidadCuotas} cuotas`,
      linea: selectedLinea,
      request,
      response: simulation,
      createdAtIso: new Date().toISOString()
    };

    setScenarios((prev) => [snapshot, ...prev].slice(0, MAX_SCENARIOS));
  }

  function removeScenario(id: string): void {
    setScenarios((prev) => prev.filter((item) => item.id !== id));
  }

  return {
    loadingBootstrap,
    bootstrapError,
    lineas,
    selectedLinea,
    form,
    validation,
    simulation,
    simulationError,
    simulating,
    canSimulate,
    scenarios,
    updateLinea,
    updateMonto,
    updateCuotas,
    runSimulation,
    clearSimulation,
    saveCurrentScenario,
    removeScenario
  };
}
