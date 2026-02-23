import type {
  PrestamoCuadroDeMarchaItem,
  PrestamoLinea,
  PrestamosSimularRequest,
  PrestamosSimularResponse
} from "@/lib/types/prestamos-public";

export interface PrestamosFormState {
  lineaPrestamoId: number;
  montoOtorgado: string;
  cantidadCuotas: string;
}

export interface PrestamosFormValidation {
  montoOtorgado?: string;
  cantidadCuotas?: string;
}

export interface ScenarioSnapshot {
  id: string;
  titulo: string;
  linea: PrestamoLinea;
  request: PrestamosSimularRequest;
  response: PrestamosSimularResponse;
  createdAtIso: string;
}

export interface ChartPoint {
  nroCuota: number;
  cuota: number;
  intereses: number;
  amortizacion: number;
  capitalRestante: number;
}

export function toChartPoints(cuadro: PrestamoCuadroDeMarchaItem[]): ChartPoint[] {
  return cuadro.map((item) => ({
    nroCuota: item.numeroCuota,
    cuota: item.cuota,
    intereses: item.intereses,
    amortizacion: item.amortizacion,
    capitalRestante: item.capitalRestante
  }));
}
