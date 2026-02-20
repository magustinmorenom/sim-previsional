import { describe, expect, it } from "vitest";
import { GET as getCatalogo } from "@/app/api/v1/public/prestamos/catalogo/route";
import { GET as getTasas } from "@/app/api/v1/public/prestamos/tasas/route";
import { POST as postSimular } from "@/app/api/v1/public/prestamos/simular/route";

describe("public prestamos routes", () => {
  it("GET /api/v1/public/prestamos/catalogo responde catálogo", async () => {
    const response = await getCatalogo();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.lineas)).toBe(true);
    expect(body.data.lineas.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/public/prestamos/tasas responde tasas", async () => {
    const response = await getTasas();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.data.tasaPublica.valor).toBe("number");
  });

  it("POST /api/v1/public/prestamos/simular devuelve 501 mientras la feature está deshabilitada", async () => {
    const request = new Request("http://localhost/api/v1/public/prestamos/simular", {
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

    const response = await postSimular(request);
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FEATURE_DISABLED");
  });

  it("POST /api/v1/public/prestamos/simular valida payload cuando la feature está habilitada", async () => {
    const previousFlag = process.env.ENABLE_PRESTAMOS_SIMULATION;
    process.env.ENABLE_PRESTAMOS_SIMULATION = "true";

    try {
      const request = new Request("http://localhost/api/v1/public/prestamos/simular", {
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

      const response = await postSimular(request);
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
