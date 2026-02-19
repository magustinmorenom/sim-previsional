import type {
  AuthChallengeRequest,
  AuthChallengeResponse,
  CreateSessionRequest
} from "@/lib/types/auth";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_FAKE_API_BASE_URL = "http://127.0.0.1:3000/api/fake/v1/";

interface RemoteRequestOptions {
  method: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
}

export class RemoteApiError extends Error {
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
  const raw = process.env.REMOTE_API_TIMEOUT_MS;
  const parsed = Number(raw);

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.floor(parsed);
}

function getBaseUrl(): string {
  const value = process.env.REMOTE_API_BASE_URL?.trim();
  return value || DEFAULT_FAKE_API_BASE_URL;
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.REMOTE_API_BEARER_TOKEN?.trim();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

function pickErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidates = ["error", "message", "detail"];
  for (const key of candidates) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function mapRemoteError(status: number, payload: unknown): RemoteApiError {
  const message = pickErrorMessage(payload, "La API remota devolvió un error.");

  if (status === 400) {
    return new RemoteApiError(400, "REMOTE_BAD_REQUEST", message, payload);
  }

  if (status === 401 || status === 403) {
    return new RemoteApiError(401, "REMOTE_UNAUTHORIZED", message, payload);
  }

  if (status === 410) {
    return new RemoteApiError(410, "REMOTE_OTP_EXPIRED", message, payload);
  }

  if (status === 429) {
    return new RemoteApiError(429, "REMOTE_RATE_LIMIT", message, payload);
  }

  return new RemoteApiError(502, "REMOTE_UPSTREAM_FAILURE", message, payload);
}

function normalizeChallengeResponse(payload: unknown): AuthChallengeResponse {
  if (!payload || typeof payload !== "object") {
    throw new RemoteApiError(
      502,
      "REMOTE_INVALID_RESPONSE",
      "La API remota respondió un formato inválido para el desafío OTP."
    );
  }

  const challengeId = (payload as Record<string, unknown>).challengeId;
  const expiresInSeconds = (payload as Record<string, unknown>).expiresInSeconds;
  const resendAvailableInSeconds = (payload as Record<string, unknown>).resendAvailableInSeconds;

  if (typeof challengeId !== "string" || challengeId.trim().length === 0) {
    throw new RemoteApiError(
      502,
      "REMOTE_INVALID_RESPONSE",
      "La API remota no devolvió challengeId válido."
    );
  }

  return {
    challengeId,
    expiresInSeconds:
      typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)
        ? Math.max(1, Math.floor(expiresInSeconds))
        : 600,
    resendAvailableInSeconds:
      typeof resendAvailableInSeconds === "number" && Number.isFinite(resendAvailableInSeconds)
        ? Math.max(0, Math.floor(resendAvailableInSeconds))
        : 60,
    ...(typeof (payload as Record<string, unknown>).devMode === "boolean"
      ? { devMode: (payload as Record<string, unknown>).devMode as boolean }
      : {}),
    ...(typeof (payload as Record<string, unknown>).devOtpCode === "string"
      ? { devOtpCode: (payload as Record<string, unknown>).devOtpCode as string }
      : {})
  };
}

async function requestRemote(path: string, options: RemoteRequestOptions): Promise<unknown> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, getTimeoutMs());

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw mapRemoteError(response.status, payload);
    }

    return payload;
  } catch (error) {
    if (error instanceof RemoteApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RemoteApiError(
        502,
        "REMOTE_TIMEOUT",
        "La API remota no respondió dentro del tiempo esperado."
      );
    }

    const message = error instanceof Error ? error.message : "Error de red desconocido";
    throw new RemoteApiError(502, "REMOTE_NETWORK_ERROR", message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createRemoteAuthChallenge(
  payload: AuthChallengeRequest
): Promise<AuthChallengeResponse> {
  const remotePayload = await requestRemote("auth/challenges", {
    method: "POST",
    body: payload
  });

  return normalizeChallengeResponse(remotePayload);
}

export async function verifyRemoteAuthCode(payload: CreateSessionRequest): Promise<void> {
  await requestRemote("auth/sessions", {
    method: "POST",
    body: payload
  });
}

export async function fetchRemoteAffiliateSimulationContext(payload: {
  email: string;
}): Promise<unknown> {
  return requestRemote("affiliates/simulation-context", {
    method: "GET",
    query: {
      email: payload.email
    }
  });
}
