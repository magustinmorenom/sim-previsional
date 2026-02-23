export type PrestamoTasaTipo = "FIJA" | "VARIABLE";
export type PrestamoAmortizacionSistema = "FRANCES" | "ALEMAN";

export interface PrestamoLinea {
  id: number;
  codigo: string;
  nombre: string;
  version: number;
  montoMinimo: number;
  montoMaximo: number;
  maxCuotas: number;
  sistemaAmortizacion: PrestamoAmortizacionSistema;
  descripcion: string | null;
}

export type PrestamosLineasResponse = PrestamoLinea[];

export interface PrestamosApiErrorResponse {
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
  sistemaAmortizacion?: PrestamoAmortizacionSistema;
}

export interface PrestamoSimulacionLineaResumen {
  codigo: string;
  version: number;
  nombre: string;
}

export interface PrestamoSimulacionTasaResumen {
  tipo: PrestamoTasaTipo;
  tea: number;
  fechaVigencia: string;
}

export interface PrestamoCostosIniciales {
  gastosAdmin: number;
  sellado: number;
  fondoQuebranto: number;
  total: number;
  montoNeto: number;
}

export interface PrestamoResumenSimulacion {
  cantidadCuotas: number;
  cuotaFija: number;
  totalIntereses: number;
  totalAPagar: number;
}

export interface PrestamoCuadroDeMarchaItem {
  numeroCuota: number;
  capitalPendiente: number;
  intereses: number;
  amortizacion: number;
  cuota: number;
  capitalRestante: number;
}

export interface PrestamoAmortizacionSimulacion {
  sistemaAmortizacion: PrestamoAmortizacionSistema;
  resumen: PrestamoResumenSimulacion;
  cuadroDeMarcha: PrestamoCuadroDeMarchaItem[];
}

export interface PrestamosSimularResponse {
  linea: PrestamoSimulacionLineaResumen;
  tasa: PrestamoSimulacionTasaResumen;
  costosIniciales: PrestamoCostosIniciales;
  amortizacion: PrestamoAmortizacionSimulacion;
}
