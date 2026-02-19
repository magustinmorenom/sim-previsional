import { describe, expect, it } from "vitest";
import {
  buildSimulationInputFromContext,
  validateEditableSimulationValues
} from "@/lib/simulation/build-simulation-input";
import type { AffiliateSimulationContext } from "@/lib/types/affiliate-context";

const contextFixture: AffiliateSimulationContext = {
  affiliate: {
    email: "afiliado@test.com",
    fullName: "Afiliado de Prueba"
  },
  calculationDate: "2026-02-19",
  accountBalance: 3481733.27,
  funds: {
    mandatory: 3000000,
    voluntary: 481733.27,
    total: 3481733.27
  },
  bov: 200832.23,
  mandatoryContribution: {
    startAge: 58,
    endAgeDefault: 65
  },
  voluntaryContribution: {
    startAge: 58,
    endAgeDefault: 65
  },
  beneficiaries: [
    {
      fullName: "Afiliado de Prueba",
      type: "T",
      sex: 1,
      birthDate: "1966-05-19",
      invalid: 0
    },
    {
      fullName: "Conyuge de Prueba",
      type: "C",
      sex: 2,
      birthDate: "1972-04-07",
      invalid: 0
    }
  ]
};

describe("buildSimulationInputFromContext", () => {
  it("arma el payload final combinando contexto remoto y campos editables", () => {
    const input = buildSimulationInputFromContext(contextFixture, {
      retirementAge: 66,
      voluntaryEndAge: 64,
      voluntaryMonthlyAmount: 15000
    });

    expect(input.calculationDate).toBe("2026-02-19");
    expect(input.accountBalance).toBe(3481733.27);
    expect(input.bov).toBe(200832.23);
    expect(input.mandatoryContribution.startAge).toBe(58);
    expect(input.mandatoryContribution.endAge).toBe(66);
    expect(input.voluntaryContribution.startAge).toBe(58);
    expect(input.voluntaryContribution.endAge).toBe(64);
    expect(input.voluntaryContribution.monthlyAmount).toBe(15000);
    expect(input.beneficiaries).toHaveLength(2);
    expect("fullName" in input.beneficiaries[0]).toBe(false);
  });

  it("valida reglas de negocio de los tres campos editables", () => {
    const errors = validateEditableSimulationValues(contextFixture, {
      retirementAge: 60,
      voluntaryEndAge: 67,
      voluntaryMonthlyAmount: -1
    });

    expect(errors.retirementAge).toBeTruthy();
    expect(errors.voluntaryEndAge).toBeTruthy();
    expect(errors.voluntaryMonthlyAmount).toBeTruthy();
  });
});
