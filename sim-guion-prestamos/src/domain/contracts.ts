import type {
  PrestamoCuadroDeMarchaItem,
  PrestamoLinea,
  PrestamosCatalogoApiResponse,
  PrestamosSimularRequest,
  PrestamosSimularResponse,
  PrestamosTasasApiResponse
} from "@/lib/types/prestamos-public";

export type ApiSource = "remote" | "fallback" | "unknown";

export interface PrestamosBootstrapState {
  catalogo: PrestamosCatalogoApiResponse;
  tasas: PrestamosTasasApiResponse;
  catalogoSource: ApiSource;
  tasasSource: ApiSource;
}

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
    nroCuota: item.nroCuota,
    cuota: item.cuota,
    intereses: item.intereses,
    amortizacion: item.amortizacion,
    capitalRestante: item.capitalRestante
  }));
}
