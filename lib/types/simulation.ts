export type BeneficiaryType = "T" | "C" | "H";

export interface BeneficiaryInput {
  type: BeneficiaryType;
  sex: 1 | 2;
  birthDate: string;
  invalid: 0 | 1;
}

export interface ContributionRange {
  startAge: number;
  endAge: number;
}

export interface VoluntaryContribution extends ContributionRange {
  monthlyAmount: number;
}

export interface SolidarySimulationInput {
  mrsValue?: number | null;
  matriculationDate?: string | null;
}

export interface SimulationInput {
  calculationDate: string;
  accountBalance: number;
  bov: number;
  mandatoryContribution: ContributionRange;
  voluntaryContribution: VoluntaryContribution;
  solidary?: SolidarySimulationInput;
  beneficiaries: BeneficiaryInput[];
}

export interface CountsTrace {
  n: number;
  spouses: number;
  children: number;
}

export interface AgeTraceItem {
  beneficiaryIndex: number;
  type: BeneficiaryType;
  birthDate: string;
  ageMonthsAtRetirement: number;
  diffYears: number;
  diffMonths: number;
  diffDays: number;
}

export interface Hoja2AuxRow {
  month: number;
  survivalRatio: number;
  discountFactor: number;
  discountedProduct: number;
}

export interface Hoja2AuxTrace {
  baseAgeMonth: number;
  periodCount: number;
  sumDiscountedProduct: number;
  equivalentFuu: number;
  rows: Hoja2AuxRow[];
}

export interface SimulationTrace {
  xmin: number;
  tMax: number;
  warnings: string[];
  advanced?: {
    hoja1Like: AgeTraceItem[];
    hoja2Like: Hoja2AuxTrace;
  };
}

export type SolidaryStatusCode =
  | "APPLIED_FULL"
  | "APPLIED_PROPORTIONAL"
  | "APPLIED_INCREMENTED"
  | "NOT_ELIGIBLE_AGE"
  | "NOT_ELIGIBLE_MIN_CONTRIBUTION_YEARS"
  | "NOT_SIMULABLE_MISSING_DATA"
  | "NOT_SIMULABLE_INVALID_DATA";

export interface SolidaryStatus {
  code: SolidaryStatusCode;
  message: string;
  eligible: boolean;
  mrsValue: number | null;
  contributionYears: number | null;
  requiredYears: number;
  ageAtRetirement: number | null;
  percentageApplied: number;
}

export interface SimulationResult {
  ppuu: number;
  capitalizationBenefit: number;
  projectedBenefit: number;
  solidaryBenefit: number;
  totalProjectedBenefit: number;
  solidaryStatus: SolidaryStatus;
  finalBalance: number;
  retirementDate: string;
  counts: CountsTrace;
  agesInMonths: number[];
  trace: SimulationTrace;
}

export interface MortalityTableRow {
  ageMonth: number;
  la0: number;
  la1: number;
  li0: number;
  li1: number;
  pai0: number;
  pai1: number;
}

export interface LookupFactorRow {
  age: number;
  factor: number;
}

export interface SimulationErrorPayload {
  error: string;
  details?: unknown;
}
