"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ApiSource,
  PrestamosBootstrapState,
  PrestamosFormState,
  PrestamosFormValidation,
  ScenarioSnapshot
} from "@/sim-guion-prestamos/src/domain/contracts";
import type {
  PrestamoLinea,
  PrestamosCatalogoApiResponse,
  PrestamosSimularRequest,
  PrestamosSimularResponse,
  PrestamosTasasApiResponse
} from "@/lib/types/prestamos-public";
import { parseLocaleNumber } from "@/sim-guion-prestamos/src/domain/formatters";

const DEFAULT_MONTO_SUGERIDO = 500000;
const MAX_SCENARIOS = 3;

function asApiSource(value: unknown): ApiSource {
  if (value === "remote" || value === "fallback") {
    return value;
  }

  return "unknown";
}

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

  const montoBase = Math.max(linea.limites.montoMinimo, DEFAULT_MONTO_SUGERIDO);
  const cuotasBase = Array.isArray(linea.plazosDisponibles) && linea.plazosDisponibles.length > 0
    ? linea.plazosDisponibles[0]
    : Math.min(12, linea.limites.maxCuotas);

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
  } else if (monto < selectedLinea.limites.montoMinimo || monto > selectedLinea.limites.montoMaximo) {
    errors.montoOtorgado = `El monto debe estar entre ${selectedLinea.limites.montoMinimo} y ${selectedLinea.limites.montoMaximo}.`;
  }

  const cuotas = Number(form.cantidadCuotas);
  if (!Number.isFinite(cuotas)) {
    errors.cantidadCuotas = "Ingresá una cantidad de cuotas válida.";
  } else if (cuotas < 1 || cuotas > selectedLinea.limites.maxCuotas) {
    errors.cantidadCuotas = `La línea permite entre 1 y ${selectedLinea.limites.maxCuotas} cuotas.`;
  } else if (
    selectedLinea.esConsumo &&
    Array.isArray(selectedLinea.plazosDisponibles) &&
    !selectedLinea.plazosDisponibles.includes(cuotas)
  ) {
    errors.cantidadCuotas = `Para esta línea solo están disponibles: ${selectedLinea.plazosDisponibles.join(", ")}.`;
  }

  return errors;
}

function normalizeSimulation(payload: unknown): PrestamosSimularResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeSuccess = payload as { success?: boolean; data?: unknown };
  if (!maybeSuccess.success || !maybeSuccess.data || typeof maybeSuccess.data !== "object") {
    return null;
  }

  return payload as PrestamosSimularResponse;
}

export function usePrestamosSimulator() {
  const [bootstrap, setBootstrap] = useState<PrestamosBootstrapState | null>(null);
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
        const [catalogoResponse, tasasResponse] = await Promise.all([
          fetch("/api/v1/public/prestamos/catalogo", { method: "GET" }),
          fetch("/api/v1/public/prestamos/tasas", { method: "GET" })
        ]);

        const catalogoPayload = (await catalogoResponse.json()) as PrestamosCatalogoApiResponse;
        const tasasPayload = (await tasasResponse.json()) as PrestamosTasasApiResponse;

        if (!catalogoResponse.ok || !catalogoPayload.success) {
          throw new Error(readApiMessage(catalogoPayload, "No fue posible cargar catálogo de préstamos."));
        }

        if (!tasasResponse.ok || !tasasPayload.success) {
          throw new Error(readApiMessage(tasasPayload, "No fue posible cargar tasas de préstamos."));
        }

        const nextBootstrap: PrestamosBootstrapState = {
          catalogo: catalogoPayload,
          tasas: tasasPayload,
          catalogoSource: asApiSource(catalogoPayload.source),
          tasasSource: asApiSource(tasasPayload.source)
        };

        setBootstrap(nextBootstrap);

        const firstLinea = catalogoPayload.data.lineas[0] ?? null;
        setForm(buildInitialForm(firstLinea));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No fue posible cargar simulador de préstamos.";
        setBootstrapError(message);
      } finally {
        setLoadingBootstrap(false);
      }
    })();
  }, []);

  const lineas = bootstrap?.catalogo.data.lineas ?? [];

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
      cantidadCuotas: Number(form.cantidadCuotas)
    };

    setSimulating(true);

    try {
      const response = await fetch("/api/v1/public/prestamos/simular", {
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
      cantidadCuotas: Number(form.cantidadCuotas)
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
    bootstrap,
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
