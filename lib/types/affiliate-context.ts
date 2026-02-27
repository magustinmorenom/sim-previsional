import type { BeneficiaryInput } from "@/lib/types/simulation";

export interface AffiliateBeneficiary extends BeneficiaryInput {
  fullName: string;
}

export type SolidarySourceStatus =
  | "READY"
  | "MISSING_MRS"
  | "MISSING_MATRICULATION_DATE"
  | "MISSING_BOTH";

export interface AffiliateSolidaryContext {
  mrsValue: number | null;
  matriculationDate: string | null;
  sourceStatus: SolidarySourceStatus;
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
  solidary: AffiliateSolidaryContext;
  beneficiaries: AffiliateBeneficiary[];
}
