import { describe, expect, it, vi } from "vitest";
import { GET as getLineas } from "@/app/api/v1/public/prestamos/lineas/route";
import { POST as postSimulate } from "@/app/api/v1/public/prestamos/simulate/route";

describe("public prestamos routes", () => {
  it("GET /api/v1/public/prestamos/lineas responde líneas", async () => {
    const previousBaseUrl = process.env.PRESTAMOS_API_BASE_URL;
    const previousApiKey = process.env.PRESTAMOS_API_KEY;
    process.env.PRESTAMOS_API_BASE_URL = "http://example.test/";
    process.env.PRESTAMOS_API_KEY = "widget_key_dev_12345";

    const lineasPayload = [
      {
        id: 1,
        codigo: "LP001",
        nombre: "Préstamos personales",
        version: 1,
        montoMinimo: 0,
        montoMaximo: 6450000,
        maxCuotas: 48,
        sistemaAmortizacion: "FRANCES",
        descripcion: "Préstamo para uso personal sin destino específico"
      }
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => lineasPayload
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const response = await getLineas();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    } finally {
      if (previousBaseUrl === undefined) {
        delete process.env.PRESTAMOS_API_BASE_URL;
      } else {
        process.env.PRESTAMOS_API_BASE_URL = previousBaseUrl;
      }
      if (previousApiKey === undefined) {
        delete process.env.PRESTAMOS_API_KEY;
      } else {
        process.env.PRESTAMOS_API_KEY = previousApiKey;
      }
      vi.unstubAllGlobals();
    }
  });

  it("POST /api/v1/public/prestamos/simulate devuelve 501 mientras la feature está deshabilitada", async () => {
    const request = new Request("http://localhost/api/v1/public/prestamos/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lineaPrestamoId: 1,
        montoOtorgado: 500000,
        cantidadCuotas: 12
      })
    });

    const response = await postSimulate(request);
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  it("POST /api/v1/public/prestamos/simulate valida payload cuando la feature está habilitada", async () => {
    const previousFlag = process.env.ENABLE_PRESTAMOS_SIMULATION;
    process.env.ENABLE_PRESTAMOS_SIMULATION = "true";

    try {
      const request = new Request("http://localhost/api/v1/public/prestamos/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lineaPrestamoId: 1,
          montoOtorgado: -10,
          cantidadCuotas: 0
        })
      });

      const response = await postSimulate(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ENABLE_PRESTAMOS_SIMULATION;
      } else {
        process.env.ENABLE_PRESTAMOS_SIMULATION = previousFlag;
      }
    }
  });
});
