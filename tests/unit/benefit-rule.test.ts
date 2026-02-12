import { describe, expect, it } from "vitest";
import { determineBenefitProportion } from "@/lib/calc/engine";

describe("determineBenefitProportion", () => {
  it("retorna 1 para causante vivo", () => {
    const b = determineBenefitProportion({
      n: 3,
      cs: 1,
      hs: 1,
      gh: 0,
      gc: 1,
      titularAlive: true
    });

    expect(b).toBe(1);
  });

  it("retorna 0.9 cuando gh=2", () => {
    const b = determineBenefitProportion({
      n: 4,
      cs: 1,
      hs: 3,
      gh: 2,
      gc: 0,
      titularAlive: false
    });

    expect(b).toBe(0.9);
  });

  it("retorna 0.7 cuando gh=1", () => {
    const b = determineBenefitProportion({
      n: 4,
      cs: 1,
      hs: 2,
      gh: 1,
      gc: 0,
      titularAlive: false
    });

    expect(b).toBe(0.7);
  });
});
