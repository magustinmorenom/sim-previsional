import { describe, expect, it } from "vitest";
import { runSimulation } from "@/lib/calc/engine";
import { defaultSimulationInput } from "@/lib/defaults";

describe("simulation parity", () => {
  it("reproduce el caso base del excel con tolerancia estricta", () => {
    const result = runSimulation(defaultSimulationInput);
    const expectedPpuu = 180.7791975865581;
    const expectedFinalBalance = 6375620.8869871786;
    // El valor de beneficio debe ser consistente con la división de base
    // para evitar falsos negativos por ruido numérico en doubles.
    const expectedProjectedBenefit = expectedFinalBalance / expectedPpuu;

    expect(result.ppuu).toBeCloseTo(expectedPpuu, 10);
    expect(result.finalBalance).toBeCloseTo(expectedFinalBalance, 8);
    expect(result.projectedBenefit).toBeCloseTo(expectedProjectedBenefit, 10);
    expect(result.retirementDate).toBe("2031-05-19");
    expect(result.counts.n).toBe(2);
    expect(result.counts.spouses).toBe(1);
    expect(result.counts.children).toBe(0);
  });
});
