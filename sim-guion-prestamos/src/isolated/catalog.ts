import type { IsolatedPrestamosCatalog } from "@/sim-guion-prestamos/src/isolated/types";

const DEFAULT_GENERAL_ANTIGUEDAD = {
  JOVEN: 6,
  ACTIVO: 12,
  PASIVO: 12
} as const;

const CONSUMO_COSTOS = {
  gastosAdminPorcentaje: 0,
  gastosAdminMinimo: 0,
  selladoPorcentaje: 0,
  fondoQuebrantoPorcentaje: 2,
  seguroVidaPorcentaje: 0,
  seguroIncendioPorcentaje: 0,
  gastosAdminFijo: 0
};

const COSTOS_CERO = {
  gastosAdminPorcentaje: 0,
  gastosAdminMinimo: 0,
  selladoPorcentaje: 0,
  fondoQuebrantoPorcentaje: 0,
  seguroVidaPorcentaje: 0,
  seguroIncendioPorcentaje: 0,
  gastosAdminFijo: 0
};

export const PRESTAMOS_ISOLATED_CATALOG: IsolatedPrestamosCatalog = {
  fuente: "https://sps.cpceer.org.ar/prestamos/",
  generadoEn: "2026-02-24T00:00:00Z",
  tasas: {
    fijaByAffiliate: {
      JOVEN: 29,
      ACTIVO: 30,
      PASIVO: 28,
      EMPLEADO: 27
    },
    variableBadlar: 27,
    variableSpread: 4,
    tasaMinima: 27,
    consumoEscalonado: {
      hasta6: {
        JOVEN: 0,
        ACTIVO: 10,
        PASIVO: 13
      },
      hasta12OMas: {
        JOVEN: 15,
        ACTIVO: 20,
        PASIVO: 25
      }
    }
  },
  lineas: [
    {
      id: 101,
      codigo: "CONS-ESP",
      nombre: "Consumo Específico",
      categoria: "Consumo",
      descripcion: "Bienes muebles: neumáticos y mobiliario de oficina.",
      destino: "Adquisición de bienes muebles.",
      url: "https://sps.cpceer.org.ar/prestamo/prestamo-para-consumo-especifico/",
      montoMinimo: 0,
      montoMaximo: 3_035_000,
      maxCuotas: 12,
      plazosDisponibles: [6, 12],
      amortizacionSistema: "ALEMAN",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: CONSUMO_COSTOS,
      garantia: "Sin garantía adicional",
      restricciones: ["Sin gastos administrativos", "Aplica fondo de quebranto del 2%"],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 102,
      codigo: "CONS-TUR",
      nombre: "Fines Turísticos y Recreación",
      categoria: "Consumo",
      descripcion: "Hospedaje en alojamientos de la provincia de Entre Ríos.",
      destino: "Financiar hospedaje turístico.",
      url: "https://sps.cpceer.org.ar/prestamo/prestamos-con-fines-turisticos-y-de-recreacion-afiliados-pasivos/",
      montoMinimo: 0,
      montoMaximo: 1_570_000,
      maxCuotas: 12,
      plazosDisponibles: [6, 12],
      amortizacionSistema: "ALEMAN",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["PASIVO"],
      costos: CONSUMO_COSTOS,
      garantia: "Sin garantía adicional",
      restricciones: ["Solo afiliados pasivos", "Solo hospedaje en Entre Ríos", "Aplica fondo de quebranto del 2%"],
      minAntiguedadMesesByAffiliate: {
        PASIVO: 12
      },
      edadMaximaCancelacion: 70
    },
    {
      id: 103,
      codigo: "CONS-EQI",
      nombre: "Equipamiento Informático",
      categoria: "Consumo",
      descripcion: "Computadoras, notebooks, tabletas e impresoras.",
      destino: "Compra de equipamiento informático.",
      url: "https://sps.cpceer.org.ar/prestamo/prestamos-equipamiento-informatico/",
      montoMinimo: 0,
      montoMaximo: 3_585_000,
      maxCuotas: 12,
      plazosDisponibles: [6, 12],
      amortizacionSistema: "ALEMAN",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: CONSUMO_COSTOS,
      garantia: "Sin garantía adicional",
      restricciones: [
        "Proveedor con actividad en Entre Ríos",
        "Proveedor con antigüedad mínima de 6 meses",
        "Aplica fondo de quebranto del 2%"
      ],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 104,
      codigo: "CONS-MAT",
      nombre: "Materiales de Construcción",
      categoria: "Consumo",
      descripcion: "Compra de materiales para construcción.",
      destino: "Adquisición de materiales.",
      url: "https://sps.cpceer.org.ar/prestamo/prestamos-materiales-de-construccion/",
      montoMinimo: 0,
      montoMaximo: 6_790_000,
      maxCuotas: 18,
      plazosDisponibles: [12, 18],
      amortizacionSistema: "ALEMAN",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: CONSUMO_COSTOS,
      garantia: "Sin garantía adicional",
      restricciones: [
        "Plazos exclusivos de 12 y 18 cuotas",
        "Proveedor con actividad en Entre Ríos y antigüedad mínima de 6 meses",
        "Aplica fondo de quebranto del 2%"
      ],
      minAntiguedadMesesByAffiliate: {
        JOVEN: 6,
        ACTIVO: 6,
        PASIVO: 6
      },
      edadMaximaCancelacion: 70
    },
    {
      id: 201,
      codigo: "SF-TF",
      nombre: "Sola Firma - Tasa Fija",
      categoria: "Sola Firma",
      descripcion: "Libre destino con sistema francés.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/sola-firma-tasa-fija/",
      montoMinimo: 0,
      montoMaximo: 12_000_000,
      maxCuotas: 48,
      maxCuotasByAffiliate: {
        JOVEN: 48,
        ACTIVO: 36,
        PASIVO: 36
      },
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Sin garantía",
      restricciones: ["Edad máxima de cancelación: 70 años"],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 202,
      codigo: "SF-TV",
      nombre: "Sola Firma - Tasa Variable",
      categoria: "Sola Firma",
      descripcion: "Libre destino con BADLAR + 4pp.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/sola-firma-tasa-variable/",
      montoMinimo: 0,
      montoMaximo: 12_000_000,
      maxCuotas: 48,
      maxCuotasByAffiliate: {
        JOVEN: 48,
        ACTIVO: 36,
        PASIVO: 36
      },
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["VARIABLE"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Sin garantía",
      restricciones: ["Edad máxima de cancelación: 70 años"],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 301,
      codigo: "PG-TF",
      nombre: "Personal con Garantía - Tasa Fija",
      categoria: "Personal con Garantía",
      descripcion: "Libre destino con garante profesional.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/personal-con-garantia-tasa-fija/",
      montoMinimo: 0,
      montoMaximo: 24_000_000,
      maxCuotas: 60,
      maxCuotasByAffiliate: {
        JOVEN: 60,
        ACTIVO: 48,
        PASIVO: 48
      },
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Garante matriculado CPCEER",
      restricciones: ["El garante debe cumplir requisitos equivalentes al solicitante"],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 302,
      codigo: "PG-TV",
      nombre: "Personal con Garantía - Tasa Variable",
      categoria: "Personal con Garantía",
      descripcion: "Libre destino con BADLAR + 4pp.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/personal-con-garantia-tasa-variable/",
      montoMinimo: 0,
      montoMaximo: 24_000_000,
      maxCuotas: 60,
      maxCuotasByAffiliate: {
        JOVEN: 60,
        ACTIVO: 48,
        PASIVO: 48
      },
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["VARIABLE"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO", "PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Garante matriculado CPCEER",
      restricciones: ["El garante debe cumplir requisitos equivalentes al solicitante"],
      minAntiguedadMesesByAffiliate: DEFAULT_GENERAL_ANTIGUEDAD,
      edadMaximaCancelacion: 70
    },
    {
      id: 401,
      codigo: "INI-JOV",
      nombre: "Iniciación Joven Profesional",
      categoria: "Iniciación",
      descripcion: "Línea exclusiva para comienzo de actividad profesional.",
      destino: "Inicio de actividad profesional",
      url: "https://sps.cpceer.org.ar/prestamo/iniciacion-joven-profesional/",
      montoMinimo: 0,
      montoMaximo: 4_000_000,
      maxCuotas: 36,
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA", "VARIABLE"],
      afiliadosHabilitados: ["JOVEN"],
      costos: COSTOS_CERO,
      garantia: "Sin garantía",
      restricciones: [
        "Edad menor a 32 años",
        "Antigüedad mayor a 6 meses y menor a 36 meses"
      ],
      minAntiguedadMesesByAffiliate: {
        JOVEN: 7
      },
      maxAntiguedadMesesByAffiliate: {
        JOVEN: 35
      },
      requiereEdadMenorA: 32,
      edadMaximaCancelacion: 70
    },
    {
      id: 501,
      codigo: "JUB-TF",
      nombre: "Jubilados SPS - Tasa Fija",
      categoria: "Jubilados",
      descripcion: "Línea para afiliados en goce de jubilación SPS.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/jubilados-sps-tasa-fija/",
      montoMinimo: 0,
      montoMaximo: 4_000_000,
      maxCuotas: 24,
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA"],
      afiliadosHabilitados: ["PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Sin garantía",
      restricciones: [
        "Solo afiliados pasivos",
        "Si edad < 65, debe cumplir 65 dentro del plazo",
        "Última cuota antes de los 80 años"
      ],
      minAntiguedadMesesByAffiliate: {
        PASIVO: 12
      },
      requiereCumplir65DurantePlazo: true,
      edadMaximaCancelacion: 80
    },
    {
      id: 502,
      codigo: "JUB-TV",
      nombre: "Jubilados SPS - Tasa Variable",
      categoria: "Jubilados",
      descripcion: "Línea variable BADLAR + 4pp para pasivos.",
      destino: "Libre destino",
      url: "https://sps.cpceer.org.ar/prestamo/jubilados-sps-tasa-variable/",
      montoMinimo: 0,
      montoMaximo: 4_000_000,
      maxCuotas: 24,
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["VARIABLE"],
      afiliadosHabilitados: ["PASIVO"],
      costos: COSTOS_CERO,
      garantia: "Sin garantía",
      restricciones: [
        "Solo afiliados pasivos",
        "Si edad < 65, debe cumplir 65 dentro del plazo",
        "Última cuota antes de los 80 años"
      ],
      minAntiguedadMesesByAffiliate: {
        PASIVO: 12
      },
      requiereCumplir65DurantePlazo: true,
      edadMaximaCancelacion: 80
    },
    {
      id: 601,
      codigo: "PREN",
      nombre: "Prendario",
      categoria: "Prendario",
      descripcion: "Automotores nuevos o usados (hasta 5 años).",
      destino: "Adquisición de automotores",
      url: "https://sps.cpceer.org.ar/prestamo/prendario/",
      montoMinimo: 0,
      montoMaximo: 42_000_000,
      maxCuotas: 96,
      maxCuotasByAffiliate: {
        JOVEN: 96,
        ACTIVO: 60
      },
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA", "VARIABLE"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO"],
      costos: COSTOS_CERO,
      garantia: "Prenda sobre el vehículo",
      restricciones: ["Usados con antigüedad máxima de 5 años"],
      minAntiguedadMesesByAffiliate: {
        JOVEN: 6,
        ACTIVO: 12
      },
      edadMaximaCancelacion: 70
    },
    {
      id: 701,
      codigo: "HIPO",
      nombre: "Hipotecario",
      categoria: "Hipotecario",
      descripcion: "Compra o mejora con hipoteca en Entre Ríos.",
      destino: "Adquisición/mejora de inmueble",
      url: "https://sps.cpceer.org.ar/prestamo/hipotecario/",
      montoMinimo: 0,
      montoMaximo: 85_000_000,
      maxCuotas: 180,
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA", "VARIABLE"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO"],
      costos: COSTOS_CERO,
      garantia: "Hipoteca de primer grado",
      restricciones: [
        "Inmueble ubicado en Entre Ríos",
        "Cobertura máxima 70% del valor de tasación"
      ],
      minAntiguedadMesesByAffiliate: {
        JOVEN: 6,
        ACTIVO: 12
      },
      edadMaximaCancelacion: 70
    },
    {
      id: 702,
      codigo: "HIPO-1V",
      nombre: "Hipotecario Primera Vivienda",
      categoria: "Hipotecario",
      descripcion: "Línea para primera vivienda con hipoteca.",
      destino: "Primera vivienda",
      url: "https://sps.cpceer.org.ar/prestamo/hipotecario-primera-vivienda/",
      montoMinimo: 0,
      montoMaximo: 170_000_000,
      maxCuotas: 180,
      plazosDisponibles: null,
      amortizacionSistema: "FRANCES",
      tasaModes: ["FIJA", "VARIABLE"],
      afiliadosHabilitados: ["JOVEN", "ACTIVO"],
      costos: COSTOS_CERO,
      garantia: "Hipoteca de primer grado",
      restricciones: [
        "El solicitante no debe ser titular de otro inmueble",
        "Inmueble ubicado en Entre Ríos"
      ],
      minAntiguedadMesesByAffiliate: {
        JOVEN: 6,
        ACTIVO: 12
      },
      edadMaximaCancelacion: 70
    }
  ]
};
