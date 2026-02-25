import { describe, expect, it } from "vitest";
import { computeSolidaryBenefit } from "@/lib/calc/engine";

describe("computeSolidaryBenefit", () => {
  it("aplica 100% con 35 años de aporte", () => {
    const result = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "1991-01-01"
    });

    expect(result.status.code).toBe("APPLIED_FULL");
    expect(result.status.eligible).toBe(true);
    expect(result.status.contributionYears).toBe(35);
    expect(result.solidaryBenefit).toBe(78000);
  });

  it("aplica proporcional cuando está entre 20 y 34 años", () => {
    const result = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "1996-01-01"
    });

    expect(result.status.code).toBe("APPLIED_PROPORTIONAL");
    expect(result.status.eligible).toBe(true);
    expect(result.status.contributionYears).toBe(30);
    expect(result.solidaryBenefit).toBeCloseTo((78000 * 30) / 35, 8);
  });

  it("aplica incremento y respeta tope al superar 35 años", () => {
    const uncapped = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "1986-01-01"
    });

    expect(uncapped.status.code).toBe("APPLIED_INCREMENTED");
    expect(uncapped.status.contributionYears).toBe(40);
    expect(uncapped.solidaryBenefit).toBeCloseTo(78000 * 1.05, 8);

    const capped = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "1970-01-01"
    });

    expect(capped.status.code).toBe("APPLIED_INCREMENTED");
    expect(capped.status.contributionYears).toBe(56);
    expect(capped.solidaryBenefit).toBeCloseTo(78000 * 1.1, 8);
  });

  it("marca no elegible por edad o por años mínimos", () => {
    const ageNotEligible = computeSolidaryBenefit({
      calculationDate: "2024-01-01",
      retirementAge: 64,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "1990-01-01"
    });

    expect(ageNotEligible.status.code).toBe("NOT_ELIGIBLE_AGE");
    expect(ageNotEligible.solidaryBenefit).toBe(0);

    const yearsNotEligible = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "2010-01-01"
    });

    expect(yearsNotEligible.status.code).toBe("NOT_ELIGIBLE_MIN_CONTRIBUTION_YEARS");
    expect(yearsNotEligible.status.contributionYears).toBe(16);
    expect(yearsNotEligible.solidaryBenefit).toBe(0);
  });

  it("informa no simulable cuando faltan datos o son inválidos", () => {
    const missing = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: null,
      matriculationDate: null
    });

    expect(missing.status.code).toBe("NOT_SIMULABLE_MISSING_DATA");
    expect(missing.solidaryBenefit).toBe(0);

    const invalid = computeSolidaryBenefit({
      calculationDate: "2026-01-01",
      retirementAge: 65,
      titularBirthDate: "1960-01-01",
      mrsValue: 1000,
      matriculationDate: "2026-99-99"
    });

    expect(invalid.status.code).toBe("NOT_SIMULABLE_INVALID_DATA");
    expect(invalid.solidaryBenefit).toBe(0);
  });
});
