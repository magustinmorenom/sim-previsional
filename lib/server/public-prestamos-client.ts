import type {
  PrestamosCatalogoResponse,
  PrestamosSimularRequest,
  PrestamosSimularResponse,
  PrestamosTasasResponse
} from "@/lib/types/prestamos-public";

const DEFAULT_TIMEOUT_MS = 8_000;

export class PrestamosPublicApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const fallbackCatalogo: PrestamosCatalogoResponse = {
  success: true,
  data: {
    lineas: [
      {
        id: 1,
        codigo: "LP001",
        nombre: "Préstamos personales",
        descripcion: "Préstamo para uso personal sin destino específico",
        limites: {
          montoMinimo: 0,
          montoMaximo: 6450000,
          maxCuotas: 48
        },
        amortizacion: {
          sistema: "FRANCES",
          descripcion: "Cuota fija mensual"
        },
        esConsumo: false,
        plazosDisponibles: null,
        costos: {
          otorgamiento: {
            gastosAdminPorcentaje: 1,
            gastosAdminMinimo: 90,
            selladoPorcentaje: 0.02,
            fondoQuebrantoPorcentaje: 0
          },
          cuota: {
            seguroVidaPorcentaje: 0.06,
            seguroIncendioPorcentaje: 0,
            gastosAdminFijo: 0
          }
        },
        tasa: {
          tipo: "FIJA",
          tea: 18.5,
          fechaVigencia: "2026-02-01"
        }
      },
      {
        id: 2,
        codigo: "LP002",
        nombre: "Préstamos de consumo",
        descripcion: "Préstamo para bienes de consumo con tasas por plazo",
        limites: {
          montoMinimo: 0,
          montoMaximo: 3000000,
          maxCuotas: 48
        },
        amortizacion: {
          sistema: "FRANCES",
          descripcion: "Cuota fija mensual"
        },
        esConsumo: true,
        plazosDisponibles: [6, 12, 24, 36, 48],
        costos: {
          otorgamiento: {
            gastosAdminPorcentaje: 1,
            gastosAdminMinimo: 90,
            selladoPorcentaje: 0.02,
            fondoQuebrantoPorcentaje: 0
          },
          cuota: {
            seguroVidaPorcentaje: 0.06,
            seguroIncendioPorcentaje: 0,
            gastosAdminFijo: 0
          }
        },
        tasa: {
          tipo: "FIJA",
          tea: 16.5,
          nota: "La tasa varía según el plazo seleccionado.",
          fechaVigencia: "2026-02-01"
        }
      },
      {
        id: 3,
        codigo: "LP003",
        nombre: "Préstamos hipotecarios",
        descripcion: "Préstamo para adquisición o refacción de vivienda",
        limites: {
          montoMinimo: 100000,
          montoMaximo: 50000000,
          maxCuotas: 240
        },
        amortizacion: {
          sistema: "ALEMAN",
          descripcion: "Capital fijo, cuota decreciente"
        },
        esConsumo: false,
        plazosDisponibles: null,
        costos: {
          otorgamiento: {
            gastosAdminPorcentaje: 2,
            gastosAdminMinimo: 500,
            selladoPorcentaje: 0.05,
            fondoQuebrantoPorcentaje: 1
          },
          cuota: {
            seguroVidaPorcentaje: 0.1,
            seguroIncendioPorcentaje: 0.15,
            gastosAdminFijo: 100
          }
        },
        tasa: {
          tipo: "VARIABLE",
          badlar: 14.5,
          factor: 3.5,
          tea: 18,
          nota: "Tasa variable. Referencial.",
          fechaVigencia: "2026-02-01"
        }
      }
    ],
    meta: {
      generadoEn: "2026-02-20T10:30:00Z",
      totalLineas: 3
    }
  }
};

const fallbackTasas: PrestamosTasasResponse = {
  success: true,
  data: {
    tasaPublica: {
      valor: 18.5,
      descripcion: "Tasa Efectiva Anual de referencia para líneas de tasa fija",
      fechaVigencia: "2026-02-01"
    },
    tasaVariable: {
      badlar: 14.5,
      factor: 3.5,
      tea: 18,
      descripcion: "BADLAR + factor para líneas de tasa variable",
      fechaVigencia: "2026-02-01"
    },
    ultimaActualizacion: "2026-02-01T00:00:00Z"
  }
};

function getTimeoutMs(): number {
  const raw = process.env.PRESTAMOS_API_TIMEOUT_MS;
  const parsed = Number(raw);

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(parsed);
}

function getPublicPrestamosBaseUrl(): string {
  return process.env.PRESTAMOS_API_BASE_URL?.trim() || "";
}

function getApiKey(): string {
  return process.env.API_KEY_CPS?.trim() || process.env.PRESTAMOS_API_KEY?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function ensureCatalogoResponse(payload: unknown): PrestamosCatalogoResponse {
  if (!isRecord(payload) || payload.success !== true) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "El catálogo de préstamos no tiene el formato esperado."
    );
  }

  const data = payload.data;
  if (!isRecord(data) || !Array.isArray(data.lineas) || !isRecord(data.meta)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "El catálogo de préstamos no tiene el formato esperado."
    );
  }

  return payload as unknown as PrestamosCatalogoResponse;
}

function ensureTasasResponse(payload: unknown): PrestamosTasasResponse {
  if (!isRecord(payload) || payload.success !== true) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La respuesta de tasas no tiene el formato esperado."
    );
  }

  const data = payload.data;
  if (!isRecord(data) || !isRecord(data.tasaPublica) || !isRecord(data.tasaVariable)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La respuesta de tasas no tiene el formato esperado."
    );
  }

  return payload as unknown as PrestamosTasasResponse;
}

function ensureSimulacionResponse(payload: unknown): PrestamosSimularResponse {
  if (!isRecord(payload) || payload.success !== true) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La simulación no tiene el formato esperado."
    );
  }

  const data = payload.data;
  if (!isRecord(data) || !Array.isArray(data.cuadroDeMarcha) || !isRecord(data.resumen)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La simulación no tiene el formato esperado."
    );
  }

  return payload as unknown as PrestamosSimularResponse;
}

function parseRemoteError(status: number, payload: unknown): PrestamosPublicApiError {
  if (payload && typeof payload === "object" && "error" in payload) {
    const errorBlock = (payload as { error?: { code?: string; message?: string; details?: unknown } }).error;

    if (errorBlock && typeof errorBlock.message === "string") {
      return new PrestamosPublicApiError(
        status,
        errorBlock.code || "PRESTAMOS_UPSTREAM_ERROR",
        errorBlock.message,
        errorBlock.details
      );
    }
  }

  return new PrestamosPublicApiError(status, "PRESTAMOS_UPSTREAM_ERROR", "La API pública de préstamos devolvió un error.");
}

async function requestPrestamosApi(path: string, options?: { method?: "GET" | "POST"; body?: unknown }): Promise<unknown> {
  const baseUrl = getPublicPrestamosBaseUrl();
  if (!baseUrl) {
    throw new PrestamosPublicApiError(
      503,
      "PRESTAMOS_BASE_URL_MISSING",
      "PRESTAMOS_API_BASE_URL no está configurada."
    );
  }

  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  const apiKey = getApiKey();

  try {
    const response = await fetch(url, {
      method: options?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {})
      },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw parseRemoteError(response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error instanceof PrestamosPublicApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PrestamosPublicApiError(502, "PRESTAMOS_TIMEOUT", "Timeout consultando API de préstamos.");
    }

    const message = error instanceof Error ? error.message : "Error de red al consultar API de préstamos.";
    throw new PrestamosPublicApiError(502, "PRESTAMOS_NETWORK_ERROR", message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getPrestamosCatalogo(): Promise<{ data: PrestamosCatalogoResponse; source: "remote" | "fallback" }> {
  try {
    const payload = await requestPrestamosApi("prestamos/lineas", {
      method: "GET"
    });

    return {
      data: ensureCatalogoResponse(payload),
      source: "remote"
    };
  } catch {
    return {
      data: fallbackCatalogo,
      source: "fallback"
    };
  }
}

export async function getPrestamosTasas(): Promise<{ data: PrestamosTasasResponse; source: "remote" | "fallback" }> {
  try {
    const payload = await requestPrestamosApi("prestamos/lineas", {
      method: "GET"
    });

    return {
      data: ensureTasasResponse(payload),
      source: "remote"
    };
  } catch {
    return {
      data: fallbackTasas,
      source: "fallback"
    };
  }
}

export async function postPrestamosSimulacion(body: PrestamosSimularRequest): Promise<PrestamosSimularResponse> {
  const payload = await requestPrestamosApi("prestamos/simulate", {
    method: "POST",
    body
  });

  return ensureSimulacionResponse(payload);
}

export function isPrestamosSimulationEnabled(): boolean {
  const raw = process.env.ENABLE_PRESTAMOS_SIMULATION?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
