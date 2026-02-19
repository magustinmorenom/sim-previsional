import { describe, expect, it } from "vitest";
import {
  AffiliateContextValidationError,
  mapRemoteContextToAffiliateContext
} from "@/lib/server/affiliate-context-mapper";

describe("mapRemoteContextToAffiliateContext", () => {
  it("convierte un payload remoto válido al contexto canónico", () => {
    const result = mapRemoteContextToAffiliateContext(
      {
        affiliate: {
          email: "afiliado@test.com",
          fullName: "Afiliado Demo"
        },
        calculationDate: "2026-02-19",
        funds: {
          mandatory: 3000000,
          voluntary: 481733.27
        },
        bov: 200832.23,
        mandatoryContribution: {
          startAge: 58,
          endAge: 65
        },
        voluntaryContribution: {
          startAge: 58,
          endAge: 65
        },
        beneficiaries: [
          {
            fullName: "Afiliado Demo",
            type: "T",
            sex: 1,
            birthDate: "1966-05-19",
            invalid: 0
          }
        ]
      },
      {
        email: "afiliado@test.com"
      }
    );

    expect(result.accountBalance).toBe(3481733.27);
    expect(result.funds.total).toBe(3481733.27);
    expect(result.mandatoryContribution.startAge).toBe(58);
    expect(result.voluntaryContribution.endAgeDefault).toBe(65);
    expect(result.beneficiaries).toHaveLength(1);
    expect(result.affiliate.fullName).toBe("Afiliado Demo");
    expect(result.beneficiaries[0].fullName).toBe("Afiliado Demo");
  });

  it("bloquea cuando faltan campos obligatorios", () => {
    expect(() =>
      mapRemoteContextToAffiliateContext(
        {
          calculationDate: "2026-02-19",
          bov: 200832.23,
          beneficiaries: [
            {
              type: "T",
              sex: 1,
              birthDate: "1966-05-19",
              invalid: 0
            }
          ]
        },
        {
          email: "afiliado@test.com"
        }
      )
    ).toThrowError(AffiliateContextValidationError);
  });
});
