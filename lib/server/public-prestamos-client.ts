import type {
  PrestamosLineasResponse,
  PrestamosSimularRequest,
  PrestamosSimularResponse
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
  return process.env.PRESTAMOS_API_KEY?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function ensureLineasResponse(payload: unknown): PrestamosLineasResponse {
  if (Array.isArray(payload)) {
    return payload as PrestamosLineasResponse;
  }

  if (isRecord(payload)) {
    const data = payload.data;
    if (Array.isArray(data)) {
      return data as PrestamosLineasResponse;
    }

    if (isRecord(data) && Array.isArray(data.lineas)) {
      return data.lineas as PrestamosLineasResponse;
    }

    if (Array.isArray(payload.lineas)) {
      return payload.lineas as PrestamosLineasResponse;
    }
  }

  throw new PrestamosPublicApiError(
    502,
    "PRESTAMOS_INVALID_PAYLOAD",
    "La lista de líneas no tiene el formato esperado."
  );
}

function unwrapSimulacionPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  if (payload.success === true && isRecord(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.result)) {
    return payload.result;
  }

  return payload;
}

function ensureSimulacionResponse(payload: unknown): PrestamosSimularResponse {
  const normalized = unwrapSimulacionPayload(payload);

  if (!isRecord(normalized)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La simulación no tiene el formato esperado."
    );
  }

  const { linea, tasa, costosIniciales, amortizacion } = normalized as Record<string, unknown>;

  if (!isRecord(linea) || !isRecord(tasa) || !isRecord(costosIniciales) || !isRecord(amortizacion)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La simulación no tiene el formato esperado."
    );
  }

  if (!Array.isArray(amortizacion.cuadroDeMarcha) || !isRecord(amortizacion.resumen)) {
    throw new PrestamosPublicApiError(
      502,
      "PRESTAMOS_INVALID_PAYLOAD",
      "La simulación no tiene el formato esperado."
    );
  }

  return normalized as PrestamosSimularResponse;
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

export async function getPrestamosLineas(): Promise<{ data: PrestamosLineasResponse; source: "remote" }> {
  const payload = await requestPrestamosApi("prestamos/lineas", {
    method: "GET"
  });

  return {
    data: ensureLineasResponse(payload),
    source: "remote"
  };
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
