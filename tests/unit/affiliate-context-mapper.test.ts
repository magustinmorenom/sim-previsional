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
    expect(result.solidary.sourceStatus).toBe("MISSING_BOTH");
    expect(result.beneficiaries).toHaveLength(1);
    expect(result.affiliate.fullName).toBe("Afiliado Demo");
    expect(result.beneficiaries[0].fullName).toBe("Afiliado Demo");
  });

  it("convierte formato success/data con titular y grupo familiar", () => {
    const result = mapRemoteContextToAffiliateContext(
      {
        success: true,
        message: "ok",
        data: {
          calculationDate: "2026-02-19",
          titular: {
            nombre: "Claudia Monica",
            apellido: "Ferrazzi",
            legajo: "CP154900",
            sexo: "F",
            fechaNacimiento: "1958-10-11",
            fechaMatriculacion: "1984-10-11",
            invalido: false
          },
          grupoFamiliar: [
            {
              nombre: "Carlos Humberto",
              apellido: "Muzzio Labianca",
              relacion: "CONYUGE",
              sexo: "M",
              fechaNacimiento: "1957-03-11",
              invalido: false
            },
            {
              nombre: "Bianca",
              apellido: "Muzzio",
              relacion: "HIJO",
              sexo: "F",
              fechaNacimiento: "1991-05-28",
              invalido: false
            }
          ],
          cuentaCapitalizacion: {
            aportesObligatorios: 7087732.79,
            aportesVoluntarios: 1205389.38,
            saldoTotal: 8293122.17
          },
          valorVAR: 200000,
          valorMRS: 150000,
          mandatoryContribution: {
            startAge: 44,
            endAge: 65
          },
          voluntaryContribution: {
            startAge: 44,
            endAge: 65
          }
        }
      },
      {
        email: "claudia@example.com"
      }
    );

    expect(result.affiliate.fullName).toBe("Claudia Monica Ferrazzi");
    expect(result.funds.mandatory).toBe(7087732.79);
    expect(result.funds.voluntary).toBe(1205389.38);
    expect(result.solidary.mrsValue).toBe(150000);
    expect(result.solidary.matriculationDate).toBe("1984-10-11");
    expect(result.solidary.sourceStatus).toBe("READY");
    expect(result.beneficiaries).toHaveLength(3);
    expect(result.beneficiaries[0].type).toBe("T");
    expect(result.beneficiaries[1].type).toBe("C");
    expect(result.beneficiaries[2].type).toBe("H");
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
