import { PRESTAMOS_ISOLATED_CATALOG } from "@/sim-guion-prestamos/src/isolated/catalog";
import type {
  AffiliateType,
  IsolatedContextValidation,
  IsolatedCuadroDeMarchaItem,
  IsolatedFormValidation,
  IsolatedPrestamoLinea,
  IsolatedSimulationInput,
  IsolatedSimulationPayload,
  RateMode
} from "@/sim-guion-prestamos/src/isolated/types";

const AFFILIATE_LABELS: Record<AffiliateType, string> = {
  JOVEN: "Joven profesional",
  ACTIVO: "Matriculado activo",
  PASIVO: "Jubilado/Pasivo",
  EMPLEADO: "Empleado CPCEER"
};

const RATE_MODE_LABELS: Record<RateMode, string> = {
  FIJA: "Tasa fija",
  VARIABLE: "Tasa variable"
};

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getLineaById(lineaId: number): IsolatedPrestamoLinea | null {
  return PRESTAMOS_ISOLATED_CATALOG.lineas.find((linea) => linea.id === lineaId) ?? null;
}

function resolveTea(linea: IsolatedPrestamoLinea, tipoAfiliado: AffiliateType, modalidadTasa: RateMode, cuotas: number): number {
  const tasaMinima = PRESTAMOS_ISOLATED_CATALOG.tasas.tasaMinima;

  if (linea.categoria === "Consumo") {
    if (tipoAfiliado === "EMPLEADO") {
      return tasaMinima;
    }

    const tramo = cuotas <= 6 ? "hasta6" : "hasta12OMas";
    const tea = PRESTAMOS_ISOLATED_CATALOG.tasas.consumoEscalonado[tramo][tipoAfiliado];
    return Math.max(tasaMinima, tea);
  }

  if (modalidadTasa === "VARIABLE") {
    const variable = PRESTAMOS_ISOLATED_CATALOG.tasas.variableBadlar + PRESTAMOS_ISOLATED_CATALOG.tasas.variableSpread;
    return Math.max(tasaMinima, variable);
  }

  const fija = PRESTAMOS_ISOLATED_CATALOG.tasas.fijaByAffiliate[tipoAfiliado] ?? tasaMinima;
  return Math.max(tasaMinima, fija);
}

function computeMaxCuotas(linea: IsolatedPrestamoLinea, tipoAfiliado: AffiliateType, edadActual: number): number {
  const maxByAffiliate = linea.maxCuotasByAffiliate?.[tipoAfiliado] ?? linea.maxCuotas;
  const maxByEdad = Math.floor((linea.edadMaximaCancelacion - edadActual) * 12);

  if (!Number.isFinite(maxByEdad)) {
    return 0;
  }

  return Math.max(0, Math.min(maxByAffiliate, maxByEdad));
}

function firstValidationError(errors: IsolatedFormValidation): string {
  return (
    errors.tipoAfiliado ||
    errors.modalidadTasa ||
    errors.montoOtorgado ||
    errors.cantidadCuotas ||
    errors.edadActual ||
    errors.antiguedadMeses ||
    errors.ingresoMensual ||
    "No fue posible validar la solicitud."
  );
}

function computeInitialCosts(linea: IsolatedPrestamoLinea, montoOtorgado: number) {
  const gastosAdminRaw = montoOtorgado * (linea.costos.gastosAdminPorcentaje / 100);
  const gastosAdmin = Math.max(gastosAdminRaw, linea.costos.gastosAdminMinimo);
  const sellado = montoOtorgado * (linea.costos.selladoPorcentaje / 100);
  const fondoQuebranto = montoOtorgado * (linea.costos.fondoQuebrantoPorcentaje / 100);
  const totalDescuentos = gastosAdmin + sellado + fondoQuebranto;

  return {
    montoSolicitado: round(montoOtorgado),
    gastosAdmin: round(gastosAdmin),
    sellado: round(sellado),
    fondoQuebranto: round(fondoQuebranto),
    totalDescuentos: round(totalDescuentos),
    montoAcreditado: round(montoOtorgado - totalDescuentos)
  };
}

function computeExtraPerInstallment(linea: IsolatedPrestamoLinea, montoOtorgado: number): number {
  return (
    montoOtorgado * (linea.costos.seguroVidaPorcentaje / 100) +
    montoOtorgado * (linea.costos.seguroIncendioPorcentaje / 100) +
    linea.costos.gastosAdminFijo
  );
}

function formatInstallmentDate(startDate: Date, installmentNumber: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + installmentNumber);

  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function computeFrenchSchedule(params: {
  montoOtorgado: number;
  cantidadCuotas: number;
  monthlyRate: number;
  extraPerInstallment: number;
  startDate: Date;
}) {
  const { montoOtorgado, cantidadCuotas, monthlyRate, extraPerInstallment, startDate } = params;

  const baseInstallment =
    monthlyRate === 0
      ? montoOtorgado / cantidadCuotas
      : montoOtorgado * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -cantidadCuotas)));

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalSegurosYGastos = 0;
  let totalAPagar = 0;

  const cuadroDeMarcha = [] as IsolatedCuadroDeMarchaItem[];

  for (let nroCuota = 1; nroCuota <= cantidadCuotas; nroCuota += 1) {
    const intereses = balance * monthlyRate;
    const amortizacion = baseInstallment - intereses;
    const cuota = baseInstallment + extraPerInstallment;
    const capitalRestante = Math.max(0, balance - amortizacion);

    totalIntereses += intereses;
    totalSegurosYGastos += extraPerInstallment;
    totalAPagar += cuota;

    cuadroDeMarcha.push({
      nroCuota,
      fechaVencimientoEstimada: formatInstallmentDate(startDate, nroCuota),
      capitalPendiente: round(balance),
      amortizacion: round(amortizacion),
      intereses: round(intereses),
      cuota: round(cuota),
      capitalRestante: round(capitalRestante)
    });

    balance = capitalRestante;
  }

  return {
    cuadroDeMarcha,
    resumen: {
      cuotaFija: round(baseInstallment + extraPerInstallment),
      totalIntereses: round(totalIntereses),
      totalSegurosYGastos: round(totalSegurosYGastos),
      totalAPagar: round(totalAPagar)
    }
  };
}

function computeGermanSchedule(params: {
  montoOtorgado: number;
  cantidadCuotas: number;
  monthlyRate: number;
  extraPerInstallment: number;
  startDate: Date;
}) {
  const { montoOtorgado, cantidadCuotas, monthlyRate, extraPerInstallment, startDate } = params;

  const amortizacionConstante = montoOtorgado / cantidadCuotas;

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalSegurosYGastos = 0;
  let totalAPagar = 0;

  const cuadroDeMarcha = [] as IsolatedCuadroDeMarchaItem[];

  for (let nroCuota = 1; nroCuota <= cantidadCuotas; nroCuota += 1) {
    const intereses = balance * monthlyRate;
    const cuotaBase = amortizacionConstante + intereses;
    const cuota = cuotaBase + extraPerInstallment;
    const capitalRestante = Math.max(0, balance - amortizacionConstante);

    totalIntereses += intereses;
    totalSegurosYGastos += extraPerInstallment;
    totalAPagar += cuota;

    cuadroDeMarcha.push({
      nroCuota,
      fechaVencimientoEstimada: formatInstallmentDate(startDate, nroCuota),
      capitalPendiente: round(balance),
      amortizacion: round(amortizacionConstante),
      intereses: round(intereses),
      cuota: round(cuota),
      capitalRestante: round(capitalRestante)
    });

    balance = capitalRestante;
  }

  const cuotaInicial = cuadroDeMarcha[0]?.cuota ?? 0;
  const cuotaFinal = cuadroDeMarcha[cuadroDeMarcha.length - 1]?.cuota ?? 0;
  const cuotaPromedio =
    cuadroDeMarcha.length > 0
      ? cuadroDeMarcha.reduce((acc, item) => acc + item.cuota, 0) / cuadroDeMarcha.length
      : 0;

  return {
    cuadroDeMarcha,
    resumen: {
      cuotaInicial: round(cuotaInicial),
      cuotaFinal: round(cuotaFinal),
      cuotaPromedio: round(cuotaPromedio),
      totalIntereses: round(totalIntereses),
      totalSegurosYGastos: round(totalSegurosYGastos),
      totalAPagar: round(totalAPagar)
    }
  };
}

export function validateIsolatedInput(input: IsolatedSimulationInput): IsolatedContextValidation {
  const errors: IsolatedFormValidation = {};

  const linea = getLineaById(input.lineaPrestamoId);
  if (!linea) {
    errors.cantidadCuotas = "Seleccioná una línea válida.";
    return {
      ok: false,
      errors,
      maxCuotasPermitidas: 0
    };
  }

  if (!linea.afiliadosHabilitados.includes(input.tipoAfiliado)) {
    const permitidos = linea.afiliadosHabilitados.map((item) => AFFILIATE_LABELS[item]).join(", ");
    errors.tipoAfiliado = `La línea ${linea.nombre} solo permite: ${permitidos}.`;
  }

  if (!linea.tasaModes.includes(input.modalidadTasa)) {
    const permitidas = linea.tasaModes.map((item) => RATE_MODE_LABELS[item]).join(" / ");
    errors.modalidadTasa = `La línea ${linea.nombre} solo admite: ${permitidas}.`;
  }

  if (!isNumber(input.edadActual) || input.edadActual < 18) {
    errors.edadActual = "Ingresá una edad válida (>= 18).";
  }

  if (!isNumber(input.antiguedadMeses) || input.antiguedadMeses < 0) {
    errors.antiguedadMeses = "Ingresá una antigüedad válida en meses.";
  }

  if (!isNumber(input.ingresoMensual) || input.ingresoMensual <= 0) {
    errors.ingresoMensual = "Ingresá un ingreso mensual mayor a cero para validar margen de afectación.";
  }

  if (!isNumber(input.montoOtorgado)) {
    errors.montoOtorgado = "Ingresá un monto válido.";
  } else if (input.montoOtorgado < linea.montoMinimo || input.montoOtorgado > linea.montoMaximo) {
    errors.montoOtorgado = `El monto debe estar entre ${linea.montoMinimo} y ${linea.montoMaximo}.`;
  }

  if (linea.requiereEdadMenorA && isNumber(input.edadActual) && input.edadActual >= linea.requiereEdadMenorA) {
    errors.edadActual = `La línea ${linea.nombre} requiere edad menor a ${linea.requiereEdadMenorA} años.`;
  }

  const minAntiguedad = linea.minAntiguedadMesesByAffiliate?.[input.tipoAfiliado];
  if (isNumber(minAntiguedad) && isNumber(input.antiguedadMeses) && input.antiguedadMeses < minAntiguedad) {
    errors.antiguedadMeses = `La línea ${linea.nombre} requiere al menos ${minAntiguedad} meses de antigüedad.`;
  }

  const maxAntiguedad = linea.maxAntiguedadMesesByAffiliate?.[input.tipoAfiliado];
  if (isNumber(maxAntiguedad) && isNumber(input.antiguedadMeses) && input.antiguedadMeses > maxAntiguedad) {
    errors.antiguedadMeses = `La línea ${linea.nombre} permite hasta ${maxAntiguedad} meses de antigüedad.`;
  }

  const maxCuotasPermitidas = isNumber(input.edadActual)
    ? computeMaxCuotas(linea, input.tipoAfiliado, input.edadActual)
    : 0;

  if (!isNumber(input.edadActual) || maxCuotasPermitidas <= 0) {
    errors.cantidadCuotas = `La edad actual no permite cuotas antes del límite de cancelación (${linea.edadMaximaCancelacion} años).`;
  }

  if (!Number.isInteger(input.cantidadCuotas) || input.cantidadCuotas <= 0) {
    errors.cantidadCuotas = "Ingresá una cantidad de cuotas válida.";
  } else if (input.cantidadCuotas > maxCuotasPermitidas) {
    errors.cantidadCuotas = `Para esta combinación podés simular hasta ${maxCuotasPermitidas} cuotas.`;
  }

  if (Array.isArray(linea.plazosDisponibles) && !linea.plazosDisponibles.includes(input.cantidadCuotas)) {
    errors.cantidadCuotas = `La línea ${linea.nombre} permite cuotas: ${linea.plazosDisponibles.join(", ")}.`;
  }

  if (
    linea.requiereCumplir65DurantePlazo &&
    isNumber(input.edadActual) &&
    input.edadActual < 65 &&
    Number.isInteger(input.cantidadCuotas)
  ) {
    const cuotasHasta65 = Math.ceil((65 - input.edadActual) * 12);
    if (input.cantidadCuotas < cuotasHasta65) {
      errors.cantidadCuotas = "Para línea de jubilados, si edad < 65 la última cuota debe vencer luego de cumplir 65 años.";
    }
  }

  return {
    ok: Object.values(errors).every((message) => !message),
    errors,
    maxCuotasPermitidas
  };
}

export function getIsolatedBootstrap() {
  return {
    lineas: PRESTAMOS_ISOLATED_CATALOG.lineas,
    tasas: PRESTAMOS_ISOLATED_CATALOG.tasas,
    generadoEn: PRESTAMOS_ISOLATED_CATALOG.generadoEn,
    fuente: PRESTAMOS_ISOLATED_CATALOG.fuente
  };
}

export function getAffiliateLabels() {
  return AFFILIATE_LABELS;
}

export function getRateModeLabels() {
  return RATE_MODE_LABELS;
}

export function getLineaByIdSafe(lineaId: number): IsolatedPrestamoLinea | null {
  return getLineaById(lineaId);
}

export function simulateIsolatedPrestamo(input: IsolatedSimulationInput):
  | {
    ok: true;
    payload: IsolatedSimulationPayload;
    tea: number;
    teaMensual: number;
    margenAfectacion: number;
    primeraCuota: number;
  }
  | {
    ok: false;
    errors: IsolatedFormValidation;
    message: string;
    maxCuotasPermitidas: number;
  } {
  const validation = validateIsolatedInput(input);

  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      message: firstValidationError(validation.errors),
      maxCuotasPermitidas: validation.maxCuotasPermitidas
    };
  }

  const linea = getLineaById(input.lineaPrestamoId);
  if (!linea) {
    return {
      ok: false,
      errors: {
        cantidadCuotas: "La línea seleccionada no existe."
      },
      message: "La línea seleccionada no existe.",
      maxCuotasPermitidas: 0
    };
  }

  const tea = resolveTea(linea, input.tipoAfiliado, input.modalidadTasa, input.cantidadCuotas);
  const monthlyRate = Math.pow(1 + tea / 100, 1 / 12) - 1;
  const teaMensual = round(monthlyRate * 100, 4);

  const costosIniciales = computeInitialCosts(linea, input.montoOtorgado);
  const extraPerInstallment = computeExtraPerInstallment(linea, input.montoOtorgado);

  const schedule =
    linea.amortizacionSistema === "ALEMAN"
      ? computeGermanSchedule({
          montoOtorgado: input.montoOtorgado,
          cantidadCuotas: input.cantidadCuotas,
          monthlyRate,
          extraPerInstallment,
          startDate: new Date()
        })
      : computeFrenchSchedule({
          montoOtorgado: input.montoOtorgado,
          cantidadCuotas: input.cantidadCuotas,
          monthlyRate,
          extraPerInstallment,
          startDate: new Date()
        });

  const primeraCuota = schedule.cuadroDeMarcha[0]?.cuota ?? 0;
  const margenAfectacion = round(input.ingresoMensual * 0.5);

  if (primeraCuota > margenAfectacion) {
    const errors: IsolatedFormValidation = {
      ingresoMensual: `La cuota estimada (${round(primeraCuota)}) supera el margen de afectación (${margenAfectacion}).`
    };

    return {
      ok: false,
      errors,
      message:
        "La cuota estimada supera el margen de afectación (50% del ingreso mensual). Ajustá monto, cuotas o ingreso.",
      maxCuotasPermitidas: validation.maxCuotasPermitidas
    };
  }

  const payload: IsolatedSimulationPayload = {
    success: true,
    data: {
      linea: {
        id: linea.id,
        codigo: linea.codigo,
        nombre: linea.nombre
      },
      tasa: {
        tipo: input.modalidadTasa,
        tea: round(tea, 4),
        teaMensual,
        nota:
          input.modalidadTasa === "VARIABLE"
            ? `BADLAR ${PRESTAMOS_ISOLATED_CATALOG.tasas.variableBadlar}% + ${PRESTAMOS_ISOLATED_CATALOG.tasas.variableSpread}pp (piso ${PRESTAMOS_ISOLATED_CATALOG.tasas.tasaMinima}%).`
            : `Tasa fija por categoría (${AFFILIATE_LABELS[input.tipoAfiliado]}).`
      },
      costosIniciales,
      resumen: {
        cantidadCuotas: input.cantidadCuotas,
        sistemaAmortizacion: linea.amortizacionSistema,
        ...schedule.resumen
      },
      cuadroDeMarcha: schedule.cuadroDeMarcha
    }
  };

  return {
    ok: true,
    payload,
    tea,
    teaMensual,
    margenAfectacion,
    primeraCuota
  };
}
