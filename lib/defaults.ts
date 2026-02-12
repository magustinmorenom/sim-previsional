import type { SimulationInput } from "@/lib/types/simulation";

export const defaultSimulationInput: SimulationInput = {
  calculationDate: "2024-02-22",
  accountBalance: 3481733.27,
  bov: 200832.23,
  mandatoryContribution: {
    startAge: 58,
    endAge: 65
  },
  voluntaryContribution: {
    startAge: 58,
    endAge: 65,
    monthlyAmount: 0
  },
  beneficiaries: [
    {
      type: "T",
      sex: 1,
      birthDate: "1966-05-19",
      invalid: 0
    },
    {
      type: "C",
      sex: 2,
      birthDate: "1972-04-07",
      invalid: 0
    }
  ]
};
