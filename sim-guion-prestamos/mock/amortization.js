const DATE_LOCALE = "es-AR";

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function resolveTea(linea, cuotas) {
  if (!linea.esConsumo || !Array.isArray(linea.plazosDisponibles)) {
    return linea.tasa.tea;
  }

  const teaByCuotas = {
    6: 14,
    12: 16.5,
    24: 18,
    36: 19,
    48: 20
  };

  const overrideTea = teaByCuotas[cuotas];
  if (typeof overrideTea === "number") {
    return overrideTea;
  }

  return linea.tasa.tea;
}

function computeInitialCosts(linea, montoOtorgado) {
  const otorgamiento = linea.costos.otorgamiento;

  const gastosAdminRaw = montoOtorgado * (otorgamiento.gastosAdminPorcentaje / 100);
  const gastosAdmin = Math.max(gastosAdminRaw, otorgamiento.gastosAdminMinimo);
  const sellado = montoOtorgado * (otorgamiento.selladoPorcentaje / 100);
  const fondoQuebranto = montoOtorgado * (otorgamiento.fondoQuebrantoPorcentaje / 100);

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

function computeFrenchSchedule({
  montoOtorgado,
  cantidadCuotas,
  monthlyRate,
  extraPerInstallment,
  startDate
}) {
  const baseInstallment =
    monthlyRate === 0
      ? montoOtorgado / cantidadCuotas
      : montoOtorgado * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -cantidadCuotas)));

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalSegurosYGastos = 0;
  let totalAPagar = 0;

  const cuadro = [];

  for (let nroCuota = 1; nroCuota <= cantidadCuotas; nroCuota += 1) {
    const intereses = balance * monthlyRate;
    const amortizacion = baseInstallment - intereses;
    const cuota = baseInstallment + extraPerInstallment;
    const capitalRestante = Math.max(0, balance - amortizacion);

    totalIntereses += intereses;
    totalSegurosYGastos += extraPerInstallment;
    totalAPagar += cuota;

    cuadro.push({
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
    cuadro,
    resumen: {
      cuotaFija: round(baseInstallment + extraPerInstallment),
      totalIntereses: round(totalIntereses),
      totalSegurosYGastos: round(totalSegurosYGastos),
      totalAPagar: round(totalAPagar)
    }
  };
}

function computeGermanSchedule({
  montoOtorgado,
  cantidadCuotas,
  monthlyRate,
  extraPerInstallment,
  startDate
}) {
  const amortizacionConstante = montoOtorgado / cantidadCuotas;

  let balance = montoOtorgado;
  let totalIntereses = 0;
  let totalSegurosYGastos = 0;
  let totalAPagar = 0;

  const cuadro = [];

  for (let nroCuota = 1; nroCuota <= cantidadCuotas; nroCuota += 1) {
    const intereses = balance * monthlyRate;
    const cuotaBase = amortizacionConstante + intereses;
    const cuota = cuotaBase + extraPerInstallment;
    const capitalRestante = Math.max(0, balance - amortizacionConstante);

    totalIntereses += intereses;
    totalSegurosYGastos += extraPerInstallment;
    totalAPagar += cuota;

    cuadro.push({
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

  const cuotaInicial = cuadro[0] ? cuadro[0].cuota : 0;
  const cuotaFinal = cuadro[cuadro.length - 1] ? cuadro[cuadro.length - 1].cuota : 0;
  const cuotaPromedio = cuadro.length > 0
    ? cuadro.reduce((acc, item) => acc + item.cuota, 0) / cuadro.length
    : 0;

  return {
    cuadro,
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

function formatInstallmentDate(startDate, installmentNumber) {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + installmentNumber);

  return new Intl.DateTimeFormat(DATE_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function validateRequest(linea, payload) {
  const montoOtorgado = asNumber(payload.montoOtorgado);
  const cantidadCuotas = Math.floor(asNumber(payload.cantidadCuotas));

  if (!Number.isFinite(montoOtorgado) || !Number.isFinite(cantidadCuotas)) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Configuración inválida: monto y cuotas deben ser numéricos."
        }
      }
    };
  }

  if (montoOtorgado < linea.limites.montoMinimo || montoOtorgado > linea.limites.montoMaximo) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Configuración inválida: Monto permitido entre ${linea.limites.montoMinimo} y ${linea.limites.montoMaximo}.`
        }
      }
    };
  }

  if (cantidadCuotas < 1 || cantidadCuotas > linea.limites.maxCuotas) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Configuración inválida: Máximo ${linea.limites.maxCuotas} cuotas para la línea seleccionada.`
        }
      }
    };
  }

  if (
    linea.esConsumo &&
    Array.isArray(linea.plazosDisponibles) &&
    !linea.plazosDisponibles.includes(cantidadCuotas)
  ) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Configuración inválida: la línea de consumo permite ${linea.plazosDisponibles.join(", ")} cuotas.`
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

function simulatePrestamo(catalogoPayload, payload) {
  const lineas = catalogoPayload && catalogoPayload.data && Array.isArray(catalogoPayload.data.lineas)
    ? catalogoPayload.data.lineas
    : [];

  const lineaPrestamoId = Number(payload.lineaPrestamoId);
  const linea = lineas.find((item) => item.id === lineaPrestamoId);

  if (!linea) {
    return {
      status: 404,
      body: {
        success: false,
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

  const tea = resolveTea(linea, cantidadCuotas);
  const monthlyRate = Math.pow(1 + tea / 100, 1 / 12) - 1;
  const teaMensual = round(monthlyRate * 100, 4);

  const extraPerInstallment =
    montoOtorgado * (linea.costos.cuota.seguroVidaPorcentaje / 100) +
    montoOtorgado * (linea.costos.cuota.seguroIncendioPorcentaje / 100) +
    linea.costos.cuota.gastosAdminFijo;

  const costosIniciales = computeInitialCosts(linea, montoOtorgado);

  const scheduleBuilder = linea.amortizacion.sistema === "ALEMAN"
    ? computeGermanSchedule
    : computeFrenchSchedule;

  const schedule = scheduleBuilder({
    montoOtorgado,
    cantidadCuotas,
    monthlyRate,
    extraPerInstallment,
    startDate: new Date()
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        linea: {
          id: linea.id,
          codigo: linea.codigo,
          nombre: linea.nombre
        },
        tasa: {
          tipo: linea.tasa.tipo,
          tea: round(tea, 4),
          teaMensual,
          nota: linea.tasa.nota || "Tasa de referencia calculada para la simulación mock."
        },
        costosIniciales,
        resumen: {
          cantidadCuotas,
          sistemaAmortizacion: linea.amortizacion.sistema,
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
