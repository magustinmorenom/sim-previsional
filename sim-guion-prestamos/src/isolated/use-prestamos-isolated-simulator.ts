"use client";

import { useMemo, useState } from "react";
import type { PrestamosSimularResponse } from "@/lib/types/prestamos-public";
import {
  getAffiliateLabels,
  getIsolatedBootstrap,
  getLineaByIdSafe,
  getRateModeLabels,
  simulateIsolatedPrestamo,
  validateIsolatedInput
} from "@/sim-guion-prestamos/src/isolated/engine";
import type { AffiliateType, IsolatedFormValidation, IsolatedPrestamoLinea, RateMode } from "@/sim-guion-prestamos/src/isolated/types";

interface IsolatedFormState {
  lineaPrestamoId: number;
  tipoAfiliado: AffiliateType;
  modalidadTasa: RateMode;
  montoOtorgado: string;
  cantidadCuotas: string;
  edadActual: string;
  antiguedadMeses: string;
  ingresoMensual: string;
}

interface IsolatedSimulationMeta {
  margenAfectacion: number;
  primeraCuota: number;
  tea: number;
  teaMensual: number;
}

const bootstrap = getIsolatedBootstrap();
const affiliateLabels = getAffiliateLabels();
const rateModeLabels = getRateModeLabels();

const AFFILIATE_OPTIONS: AffiliateType[] = ["JOVEN", "ACTIVO", "PASIVO", "EMPLEADO"];

function parseLocalizedNumber(value: string): number {
  const normalized = value.replace(/\./g, "").replace(/,/g, ".").trim();
  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
}

function parseInteger(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return Number.NaN;
  }

  return Number.parseInt(normalized, 10);
}

function getDefaultForm(): IsolatedFormState {
  const firstLinea = bootstrap.lineas[0];
  const firstAfiliado = firstLinea.afiliadosHabilitados[0] ?? "ACTIVO";
  const firstRateMode = firstLinea.tasaModes[0] ?? "FIJA";
  const firstCuota = firstLinea.plazosDisponibles?.[0] ?? Math.min(12, firstLinea.maxCuotas);

  return {
    lineaPrestamoId: firstLinea.id,
    tipoAfiliado: firstAfiliado,
    modalidadTasa: firstRateMode,
    montoOtorgado: String(Math.min(500_000, firstLinea.montoMaximo)),
    cantidadCuotas: String(firstCuota),
    edadActual: "35",
    antiguedadMeses: "12",
    ingresoMensual: "1500000"
  };
}

function toSimulationInput(form: IsolatedFormState) {
  return {
    lineaPrestamoId: form.lineaPrestamoId,
    tipoAfiliado: form.tipoAfiliado,
    modalidadTasa: form.modalidadTasa,
    montoOtorgado: parseLocalizedNumber(form.montoOtorgado),
    cantidadCuotas: parseInteger(form.cantidadCuotas),
    edadActual: parseInteger(form.edadActual),
    antiguedadMeses: parseInteger(form.antiguedadMeses),
    ingresoMensual: parseLocalizedNumber(form.ingresoMensual)
  };
}

function normalizeFormForLinea(form: IsolatedFormState, linea: IsolatedPrestamoLinea): IsolatedFormState {
  const nextAfiliado = linea.afiliadosHabilitados.includes(form.tipoAfiliado)
    ? form.tipoAfiliado
    : linea.afiliadosHabilitados[0] ?? "ACTIVO";

  const nextRateMode = linea.tasaModes.includes(form.modalidadTasa)
    ? form.modalidadTasa
    : linea.tasaModes[0] ?? "FIJA";

  const requestedCuotas = parseInteger(form.cantidadCuotas);
  const nextCuotas = Array.isArray(linea.plazosDisponibles)
    ? linea.plazosDisponibles.includes(requestedCuotas)
      ? requestedCuotas
      : linea.plazosDisponibles[0]
    : Number.isFinite(requestedCuotas)
      ? Math.max(1, Math.min(requestedCuotas, linea.maxCuotas))
      : Math.min(12, linea.maxCuotas);

  const nextMonto = parseLocalizedNumber(form.montoOtorgado);
  const montoInRange = Number.isFinite(nextMonto)
    ? Math.max(linea.montoMinimo, Math.min(nextMonto, linea.montoMaximo))
    : Math.min(500_000, linea.montoMaximo);

  return {
    ...form,
    tipoAfiliado: nextAfiliado,
    modalidadTasa: nextRateMode,
    montoOtorgado: String(Math.floor(montoInRange)),
    cantidadCuotas: String(nextCuotas)
  };
}

export function usePrestamosIsolatedSimulator() {
  const [form, setForm] = useState<IsolatedFormState>(getDefaultForm);
  const [simulation, setSimulation] = useState<PrestamosSimularResponse | null>(null);
  const [simulationMeta, setSimulationMeta] = useState<IsolatedSimulationMeta | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const lineas = bootstrap.lineas;

  const selectedLinea = useMemo(
    () => getLineaByIdSafe(form.lineaPrestamoId) ?? lineas[0] ?? null,
    [form.lineaPrestamoId, lineas]
  );

  const parsedInput = useMemo(() => toSimulationInput(form), [form]);

  const contextValidation = useMemo(() => validateIsolatedInput(parsedInput), [parsedInput]);

  const validation: IsolatedFormValidation = contextValidation.errors;

  const canSimulate =
    selectedLinea !== null &&
    Object.values(validation).every((message) => !message);

  function updateLinea(lineaId: number): void {
    const linea = getLineaByIdSafe(lineaId);
    if (!linea) {
      return;
    }

    setForm((prev) => normalizeFormForLinea({ ...prev, lineaPrestamoId: linea.id }, linea));
    setSimulation(null);
    setSimulationMeta(null);
    setSimulationError(null);
  }

  function updateMonto(value: string): void {
    setForm((prev) => ({ ...prev, montoOtorgado: value }));
  }

  function updateCuotas(value: string): void {
    setForm((prev) => ({ ...prev, cantidadCuotas: value }));
  }

  function updateEdad(value: string): void {
    setForm((prev) => ({ ...prev, edadActual: value }));
  }

  function updateAntiguedad(value: string): void {
    setForm((prev) => ({ ...prev, antiguedadMeses: value }));
  }

  function updateIngreso(value: string): void {
    setForm((prev) => ({ ...prev, ingresoMensual: value }));
  }

  function updateTipoAfiliado(value: AffiliateType): void {
    setForm((prev) => {
      const next = { ...prev, tipoAfiliado: value };
      if (!selectedLinea) {
        return next;
      }

      return normalizeFormForLinea(next, selectedLinea);
    });

    setSimulation(null);
    setSimulationMeta(null);
    setSimulationError(null);
  }

  function updateModalidadTasa(value: RateMode): void {
    setForm((prev) => ({ ...prev, modalidadTasa: value }));
    setSimulation(null);
    setSimulationMeta(null);
    setSimulationError(null);
  }

  function clearSimulation(): void {
    setSimulation(null);
    setSimulationMeta(null);
    setSimulationError(null);
  }

  function runSimulation(): void {
    const result = simulateIsolatedPrestamo(parsedInput);

    if (!result.ok) {
      setSimulation(null);
      setSimulationMeta(null);
      setSimulationError(result.message);
      return;
    }

    setSimulation(result.payload);
    setSimulationMeta({
      margenAfectacion: result.margenAfectacion,
      primeraCuota: result.primeraCuota,
      tea: result.tea,
      teaMensual: result.teaMensual
    });
    setSimulationError(null);
  }

  const cuotasConsumo = selectedLinea?.plazosDisponibles ?? [];

  return {
    generatedAt: bootstrap.generadoEn,
    fuente: bootstrap.fuente,
    lineas,
    selectedLinea,
    form,
    validation,
    simulation,
    simulationMeta,
    simulationError,
    canSimulate,
    cuotasConsumo,
    affiliateOptions: AFFILIATE_OPTIONS,
    affiliateLabels,
    rateModeLabels,
    maxCuotasPermitidas: contextValidation.maxCuotasPermitidas,
    updateLinea,
    updateMonto,
    updateCuotas,
    updateEdad,
    updateAntiguedad,
    updateIngreso,
    updateTipoAfiliado,
    updateModalidadTasa,
    runSimulation,
    clearSimulation
  };
}
