export type AffiliateType = "JOVEN" | "ACTIVO" | "PASIVO" | "EMPLEADO";
export type RateMode = "FIJA" | "VARIABLE";

export type IsolatedAmortizationSystem = "FRANCES" | "ALEMAN";

export interface IsolatedCostConfig {
  gastosAdminPorcentaje: number;
  gastosAdminMinimo: number;
  selladoPorcentaje: number;
  fondoQuebrantoPorcentaje: number;
  seguroVidaPorcentaje: number;
  seguroIncendioPorcentaje: number;
  gastosAdminFijo: number;
}

export interface IsolatedPrestamoLinea {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  destino: string;
  url: string;
  montoMinimo: number;
  montoMaximo: number;
  maxCuotas: number;
  maxCuotasByAffiliate?: Partial<Record<AffiliateType, number>>;
  plazosDisponibles: number[] | null;
  amortizacionSistema: IsolatedAmortizationSystem;
  tasaModes: RateMode[];
  afiliadosHabilitados: AffiliateType[];
  costos: IsolatedCostConfig;
  garantia: string;
  restricciones: string[];
  minAntiguedadMesesByAffiliate?: Partial<Record<AffiliateType, number>>;
  maxAntiguedadMesesByAffiliate?: Partial<Record<AffiliateType, number>>;
  requiereEdadMenorA?: number;
  requiereCumplir65DurantePlazo?: boolean;
  edadMaximaCancelacion: number;
}

export interface IsolatedRateConfig {
  fijaByAffiliate: Record<AffiliateType, number>;
  variableBadlar: number;
  variableSpread: number;
  tasaMinima: number;
  consumoEscalonado: {
    hasta6: Record<"JOVEN" | "ACTIVO" | "PASIVO", number>;
    hasta12OMas: Record<"JOVEN" | "ACTIVO" | "PASIVO", number>;
  };
}

export interface IsolatedPrestamosCatalog {
  lineas: IsolatedPrestamoLinea[];
  tasas: IsolatedRateConfig;
  generadoEn: string;
  fuente: string;
}

export interface IsolatedSimulationInput {
  lineaPrestamoId: number;
  tipoAfiliado: AffiliateType;
  modalidadTasa: RateMode;
  montoOtorgado: number;
  cantidadCuotas: number;
  edadActual: number;
  antiguedadMeses: number;
  ingresoMensual: number;
}

export interface IsolatedFormValidation {
  tipoAfiliado?: string;
  modalidadTasa?: string;
  montoOtorgado?: string;
  cantidadCuotas?: string;
  edadActual?: string;
  antiguedadMeses?: string;
  ingresoMensual?: string;
}

export interface IsolatedContextValidation {
  ok: boolean;
  errors: IsolatedFormValidation;
  maxCuotasPermitidas: number;
}

export interface IsolatedCuadroDeMarchaItem {
  nroCuota: number;
  fechaVencimientoEstimada: string;
  capitalPendiente: number;
  amortizacion: number;
  intereses: number;
  cuota: number;
  capitalRestante: number;
}

export interface IsolatedSimulationPayload {
  success: true;
  data: {
    linea: {
      id: number;
      codigo: string;
      nombre: string;
    };
    tasa: {
      tipo: RateMode;
      tea: number;
      teaMensual: number;
      nota: string;
    };
    costosIniciales: {
      montoSolicitado: number;
      gastosAdmin: number;
      sellado: number;
      fondoQuebranto: number;
      totalDescuentos: number;
      montoAcreditado: number;
    };
    resumen: {
      cantidadCuotas: number;
      sistemaAmortizacion: IsolatedAmortizationSystem;
      cuotaFija?: number;
      cuotaInicial?: number;
      cuotaFinal?: number;
      cuotaPromedio?: number;
      totalIntereses: number;
      totalSegurosYGastos: number;
      totalAPagar: number;
    };
    cuadroDeMarcha: IsolatedCuadroDeMarchaItem[];
  };
}
