const DEFAULT_TEA = 18.5;
const DEFAULT_TASA_VIGENCIA = "2026-02-01";

const TEA_BY_CODIGO = {
  LP001: 18.5,
  LP002: 16.5,
  LP003: 18
};

const COSTOS_CONFIG = {
  gastosAdminPorcentaje: 1,
  gastosAdminMinimo: 90,
  selladoPorcentaje: 0.02,
  fondoQuebrantoPorcentaje: 0
};

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function resolveTea(linea) {
  if (linea && linea.codigo && TEA_BY_CODIGO[linea.codigo]) {
    return TEA_BY_CODIGO[linea.codigo];
  }

  return DEFAULT_TEA;
}

function computeInitialCosts(montoOtorgado) {
  const gastosAdminRaw = montoOtorgado * (COSTOS_CONFIG.gastosAdminPorcentaje / 100);
  const gastosAdmin = Math.max(gastosAdminRaw, COSTOS_CONFIG.gastosAdminMinimo);
  const sellado = montoOtorgado * (COSTOS_CONFIG.selladoPorcentaje / 100);
  const fondoQuebranto = montoOtorgado * (COSTOS_CONFIG.fondoQuebrantoPorcentaje / 100);
  const total = gastosAdmin + sellado + fondoQuebranto;

  return {
    gastosAdmin: round(gastosAdmin),
    sellado: round(sellado),
    fondoQuebranto: round(fondoQuebranto),
    total: round(total),
    montoNeto: round(montoOtorgado - total)
  };
}

function computeFrenchSchedule({
  montoOtorgado,
  cantidadCuotas,
  monthlyRate
}) {
  const baseInstallment =
    monthlyRate === 0
      ? montoOtorgado / cantidadCuotas
      : montoOtorgado * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -cantidadCuotas)));

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalAPagar = 0;

  const cuadro = [];

  for (let numeroCuota = 1; numeroCuota <= cantidadCuotas; numeroCuota += 1) {
    const intereses = balance * monthlyRate;
    const amortizacion = baseInstallment - intereses;
    const cuota = baseInstallment;
    const capitalRestante = Math.max(0, balance - amortizacion);

    totalIntereses += intereses;
    totalAPagar += cuota;

    cuadro.push({
      numeroCuota,
      capitalPendiente: round(balance),
      amortizacion: round(amortizacion),
      intereses: round(intereses),
      cuota: round(cuota),
      capitalRestante: round(capitalRestante)
    });

    balance = capitalRestante;
  }

  return {
    cuadro,
    resumen: {
      cuotaFija: round(baseInstallment),
      totalIntereses: round(totalIntereses),
      totalAPagar: round(totalAPagar)
    }
  };
}

function computeGermanSchedule({
  montoOtorgado,
  cantidadCuotas,
  monthlyRate
}) {
  const amortizacionConstante = montoOtorgado / cantidadCuotas;

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalAPagar = 0;

  const cuadro = [];

  for (let numeroCuota = 1; numeroCuota <= cantidadCuotas; numeroCuota += 1) {
    const intereses = balance * monthlyRate;
    const cuota = amortizacionConstante + intereses;
    const capitalRestante = Math.max(0, balance - amortizacionConstante);

    totalIntereses += intereses;
    totalAPagar += cuota;

    cuadro.push({
      numeroCuota,
      capitalPendiente: round(balance),
      amortizacion: round(amortizacionConstante),
      intereses: round(intereses),
      cuota: round(cuota),
      capitalRestante: round(capitalRestante)
    });

    balance = capitalRestante;
  }

  const cuotaFija = cuadro[0] ? cuadro[0].cuota : 0;

  return {
    cuadro,
    resumen: {
      cuotaFija: round(cuotaFija),
      totalIntereses: round(totalIntereses),
      totalAPagar: round(totalAPagar)
    }
  };
}

function resolveAmortizationSystem(linea, payload) {
  if (linea && linea.sistemaAmortizacion) {
    return linea.sistemaAmortizacion;
  }

  return payload && typeof payload.sistemaAmortizacion === "string"
    ? payload.sistemaAmortizacion
    : "FRANCES";
}

function validateRequest(linea, payload) {
  const montoOtorgado = asNumber(payload.montoOtorgado);
  const cantidadCuotas = Math.floor(asNumber(payload.cantidadCuotas));

  if (!Number.isFinite(montoOtorgado) || !Number.isFinite(cantidadCuotas)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Configuración inválida: monto y cuotas deben ser numéricos."
        }
      }
    };
  }

  if (montoOtorgado < linea.montoMinimo || montoOtorgado > linea.montoMaximo) {
    return {
      ok: false,
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: `Configuración inválida: Monto permitido entre ${linea.montoMinimo} y ${linea.montoMaximo}.`
        }
      }
    };
  }

  if (cantidadCuotas < 1 || cantidadCuotas > linea.maxCuotas) {
    return {
      ok: false,
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: `Configuración inválida: Máximo ${linea.maxCuotas} cuotas para la línea seleccionada.`
        }
      }
    };
  }

  return {
    ok: true,
    montoOtorgado,
    cantidadCuotas
  };
}

function simulatePrestamo(lineas, payload) {
  const lista = Array.isArray(lineas) ? lineas : [];

  const lineaPrestamoId = Number(payload.lineaPrestamoId);
  const linea = lista.find((item) => item.id === lineaPrestamoId);

  if (!linea) {
    return {
      status: 404,
      body: {
        error: {
          code: "NOT_FOUND",
          message: "Línea de préstamo no activa o no encontrada"
        }
      }
    };
  }

  const validation = validateRequest(linea, payload);
  if (!validation.ok) {
    return {
      status: validation.status,
      body: validation.body
    };
  }

  const montoOtorgado = validation.montoOtorgado;
  const cantidadCuotas = validation.cantidadCuotas;

  const tea = resolveTea(linea);
  const monthlyRate = Math.pow(1 + tea / 100, 1 / 12) - 1;

  const costosIniciales = computeInitialCosts(montoOtorgado);

  const sistemaAmortizacion = resolveAmortizationSystem(linea, payload);
  const scheduleBuilder = sistemaAmortizacion === "ALEMAN"
    ? computeGermanSchedule
    : computeFrenchSchedule;

  const schedule = scheduleBuilder({
    montoOtorgado,
    cantidadCuotas,
    monthlyRate
  });

  return {
    status: 200,
    body: {
      linea: {
        codigo: linea.codigo,
        version: linea.version,
        nombre: linea.nombre
      },
      tasa: {
        tipo: "FIJA",
        tea: round(tea, 4),
        fechaVigencia: DEFAULT_TASA_VIGENCIA
      },
      costosIniciales,
      amortizacion: {
        sistemaAmortizacion,
        resumen: {
          cantidadCuotas,
          ...schedule.resumen
        },
        cuadroDeMarcha: schedule.cuadro
      }
    }
  };
}

module.exports = {
  simulatePrestamo
};
