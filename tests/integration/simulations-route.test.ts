import { describe, expect, it } from "vitest";
import { POST as runSimulationRoute } from "@/app/api/v1/simulations/run/route";
import { defaultSimulationInput } from "@/lib/defaults";

describe("POST /api/v1/simulations/run", () => {
  it("responde 200 para payload válido", async () => {
    const request = new Request("http://localhost/api/v1/simulations/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(defaultSimulationInput)
    });

    const response = await runSimulationRoute(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.ppuu).toBe("number");
    expect(typeof body.finalBalance).toBe("number");
    expect(typeof body.projectedBenefit).toBe("number");
  });

  it("responde 422 cuando n > 12", async () => {
    const beneficiaries = Array.from({ length: 13 }, (_, idx) => ({
      type: idx === 0 ? "T" : "H",
      sex: 1 as const,
      birthDate: "2000-01-01",
      invalid: 0 as const
    }));

    const request = new Request("http://localhost/api/v1/simulations/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...defaultSimulationInput,
        beneficiaries
      })
    });

    const response = await runSimulationRoute(request);
    expect(response.status).toBe(422);
  });
});
