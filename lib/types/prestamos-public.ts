export type PrestamoTasaTipo = "FIJA" | "VARIABLE";
export type PrestamoAmortizacionSistema = "FRANCES" | "ALEMAN" | string;

export interface PrestamoLinea {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  limites: {
    montoMinimo: number;
    montoMaximo: number;
    maxCuotas: number;
  };
  amortizacion: {
    sistema: PrestamoAmortizacionSistema;
    descripcion: string;
  };
  esConsumo: boolean;
  plazosDisponibles: number[] | null;
  costos: {
    otorgamiento: {
      gastosAdminPorcentaje: number;
      gastosAdminMinimo: number;
      selladoPorcentaje: number;
      fondoQuebrantoPorcentaje: number;
    };
    cuota: {
      seguroVidaPorcentaje: number;
      seguroIncendioPorcentaje: number;
      gastosAdminFijo: number;
    };
  };
  tasa: {
    tipo: PrestamoTasaTipo;
    tea: number;
    badlar?: number;
    factor?: number;
    nota?: string;
    fechaVigencia: string;
  };
}

export interface PrestamosCatalogoResponse {
  success: boolean;
  data: {
    lineas: PrestamoLinea[];
    meta: {
      generadoEn: string;
      totalLineas: number;
    };
  };
}

export interface PrestamosTasasResponse {
  success: boolean;
  data: {
    tasaPublica: {
      valor: number;
      descripcion: string;
      fechaVigencia: string;
    };
    tasaVariable: {
      badlar: number;
      factor: number;
      tea: number;
      descripcion: string;
      fechaVigencia: string;
    };
    ultimaActualizacion: string;
  };
}

export interface PrestamosApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PrestamosSimularRequest {
  lineaPrestamoId: number;
  montoOtorgado: number;
  cantidadCuotas: number;
}

export interface PrestamoSimulacionLineaResumen {
  id: number;
  codigo: string;
  nombre: string;
}

export interface PrestamoSimulacionTasaResumen {
  tipo: PrestamoTasaTipo;
  tea: number;
  teaMensual: number;
  nota?: string;
}

export interface PrestamoCostosIniciales {
  montoSolicitado: number;
  gastosAdmin: number;
  sellado: number;
  fondoQuebranto: number;
  totalDescuentos: number;
  montoAcreditado: number;
}

export interface PrestamoResumenSimulacion {
  cantidadCuotas: number;
  sistemaAmortizacion: PrestamoAmortizacionSistema;
  cuotaFija?: number;
  cuotaPromedio?: number;
  cuotaInicial?: number;
  cuotaFinal?: number;
  totalIntereses: number;
  totalSegurosYGastos: number;
  totalAPagar: number;
}

export interface PrestamoCuadroDeMarchaItem {
  nroCuota: number;
  fechaVencimientoEstimada: string;
  capitalPendiente: number;
  amortizacion: number;
  intereses: number;
  cuota: number;
  capitalRestante: number;
}

export interface PrestamosSimularResponse {
  success: true;
  data: {
    linea: PrestamoSimulacionLineaResumen;
    tasa: PrestamoSimulacionTasaResumen;
    costosIniciales: PrestamoCostosIniciales;
    resumen: PrestamoResumenSimulacion;
    cuadroDeMarcha: PrestamoCuadroDeMarchaItem[];
  };
}

export interface PrestamosCatalogoApiResponse extends PrestamosCatalogoResponse {
  source?: "remote" | "fallback";
}

export interface PrestamosTasasApiResponse extends PrestamosTasasResponse {
  source?: "remote" | "fallback";
}
