import type { BeneficiaryInput } from "@/lib/types/simulation";

export interface AffiliateBeneficiary extends BeneficiaryInput {
  fullName: string;
}

export interface AffiliateSimulationContext {
  affiliate: {
    email: string;
    fullName: string;
  };
  calculationDate: string;
  accountBalance: number;
  funds: {
    mandatory: number;
    voluntary: number;
    total: number;
  };
  bov: number;
  mandatoryContribution: {
    startAge: number;
    endAgeDefault: number;
  };
  voluntaryContribution: {
    startAge: number;
    endAgeDefault: number;
  };
  beneficiaries: AffiliateBeneficiary[];
}
