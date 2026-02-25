import {
  getLi,
  getLookupFactor,
  getLx,
  getPai,
  technicalMetadata
} from "@/lib/data/technical-bases";
import {
  addYears,
  diffInMonthsExcelRoutine,
  maxDate,
  parseIsoDate,
  roundAgeYearsBy365_25,
  toIsoDate
} from "@/lib/calc/date-utils";
import type {
  AgeTraceItem,
  SimulationInput,
  SimulationResult,
  SolidaryStatus
} from "@/lib/types/simulation";
import { canonicalizeBeneficiaries } from "@/lib/validation/simulation-input";

const INTEREST_RATE = 1.04;
const XMIN_FIXED = technicalMetadata.xminFixed;
const LI_REFERENCE_AGE = 252;
const PBS_BASE_MRS_MULTIPLIER = 78;
const PBS_MINIMUM_AGE = 65;
const PBS_MINIMUM_YEARS = 20;
const PBS_FULL_YEARS = 35;
const PBS_INCREMENT_CAP_YEARS = 45;

interface InternalBeneficiary {
  ageMonth: number;
  sex: 1 | 2;
  invalid: 0 | 1;
  type: "T" | "C" | "H";
}

interface PpuContext {
  n: number;
  cs: number;
  hs: number;
  beneficiaries: InternalBeneficiary[];
}

interface GammaState {
  g1: number;
  g2: number;
  g3: number;
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const warnings: string[] = [];
  const orderedBeneficiaries = canonicalizeBeneficiaries(input.beneficiaries);

  const n = orderedBeneficiaries.length;
  const cs = orderedBeneficiaries.filter((item) => item.type === "C").length;
  const hs = orderedBeneficiaries.filter((item) => item.type === "H").length;
  const titular = orderedBeneficiaries.find((item) => item.type === "T");

  const calculationDate = parseIsoDate(input.calculationDate);
  const retirementAnchorBirthDate = titular
    ? parseIsoDate(titular.birthDate)
    : parseIsoDate(orderedBeneficiaries[0].birthDate);
  const retirementDate = maxDate(calculationDate, addYears(retirementAnchorBirthDate, 65));

  const hoja1Like: AgeTraceItem[] = [];

  const beneficiaries: InternalBeneficiary[] = orderedBeneficiaries.map(
    (beneficiary, idx) => {
      const birthDate = parseIsoDate(beneficiary.birthDate);
      const ageDiff = diffInMonthsExcelRoutine(birthDate, retirementDate);
      hoja1Like.push({
        beneficiaryIndex: idx + 1,
        type: beneficiary.type,
        birthDate: beneficiary.birthDate,
        ageMonthsAtRetirement: ageDiff.months,
        diffYears: ageDiff.yearsPart,
        diffMonths: ageDiff.monthsPart,
        diffDays: ageDiff.daysPart
      });

      return {
        ageMonth: ageDiff.months,
        sex: beneficiary.sex,
        invalid: beneficiary.invalid,
        type: beneficiary.type
      };
    }
  );

  const firstBirthDate = parseIsoDate(orderedBeneficiaries[0].birthDate);
  const currentAgeYears = roundAgeYearsBy365_25(firstBirthDate, calculationDate);

  const finalBalance = computeFinalBalance({
    accountBalance: input.accountBalance,
    bov: input.bov,
    mandatoryStartAge: input.mandatoryContribution.startAge,
    voluntaryStartAge: input.voluntaryContribution.startAge,
    voluntaryEndAge: input.voluntaryContribution.endAge,
    voluntaryMonthlyAmount: input.voluntaryContribution.monthlyAmount,
    currentAgeYears
  });

  const ppuContext: PpuContext = {
    n,
    cs,
    hs,
    beneficiaries
  };

  const tMax = 1332 - XMIN_FIXED;
  const ppuu = computePpu(ppuContext, tMax);

  if (ppuu === 0) {
    warnings.push("PPUU resultó 0; el beneficio proyectado se definió como 0 para evitar división por cero.");
  }

  const projectedBenefit = ppuu === 0 ? 0 : finalBalance / ppuu;
  const solidary = computeSolidaryBenefit({
    calculationDate: input.calculationDate,
    retirementAge: input.mandatoryContribution.endAge,
    titularBirthDate: titular?.birthDate ?? null,
    mrsValue: input.solidary?.mrsValue ?? null,
    matriculationDate: input.solidary?.matriculationDate ?? null
  });
  const capitalizationBenefit = projectedBenefit;
  const totalProjectedBenefit = capitalizationBenefit + solidary.solidaryBenefit;
  const hoja2Like = buildHoja2AuxTrace();

  return {
    ppuu,
    capitalizationBenefit,
    projectedBenefit,
    solidaryBenefit: solidary.solidaryBenefit,
    totalProjectedBenefit,
    solidaryStatus: solidary.status,
    finalBalance,
    retirementDate: toIsoDate(retirementDate),
    counts: {
      n,
      spouses: cs,
      children: hs
    },
    agesInMonths: beneficiaries.map((item) => item.ageMonth),
    trace: {
      xmin: XMIN_FIXED,
      tMax,
      warnings,
      advanced: {
        hoja1Like,
        hoja2Like
      }
    }
  };
}

function computeFinalBalance(args: {
  accountBalance: number;
  bov: number;
  mandatoryStartAge: number;
  voluntaryStartAge: number;
  voluntaryEndAge: number;
  voluntaryMonthlyAmount: number;
  currentAgeYears: number;
}): number {
  const accumulatedMandatoryBase =
    args.accountBalance * INTEREST_RATE ** (65 - args.currentAgeYears);

  const lookupFactor = getLookupFactor(args.mandatoryStartAge);
  if (lookupFactor === undefined) {
    return accumulatedMandatoryBase;
  }

  const voluntaryYears = args.voluntaryEndAge - args.voluntaryStartAge;
  const voluntaryAccumulated =
    (args.voluntaryMonthlyAmount *
      12 *
      (INTEREST_RATE ** voluntaryYears - 1)) /
    0.04;

  const secondTerm = lookupFactor * args.bov + voluntaryAccumulated;
  return accumulatedMandatoryBase + secondTerm;
}

export function computeSolidaryBenefit(args: {
  calculationDate: string;
  retirementAge: number;
  titularBirthDate: string | null;
  mrsValue: number | null | undefined;
  matriculationDate: string | null | undefined;
}): {
  solidaryBenefit: number;
  status: SolidaryStatus;
} {
  const mrsValue = toNullableFiniteNumber(args.mrsValue);
  const matriculationDate = typeof args.matriculationDate === "string" ? args.matriculationDate : null;

  if (mrsValue === null && !matriculationDate) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_SIMULABLE_MISSING_DATA",
        message:
          "No se puede simular el componente solidario porque faltan MRS y fecha de matriculación.",
        eligible: false,
        mrsValue: null,
        contributionYears: null,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement: null,
        percentageApplied: 0
      })
    };
  }

  if (mrsValue === null || !matriculationDate) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_SIMULABLE_MISSING_DATA",
        message:
          "No se puede simular el componente solidario porque faltan datos obligatorios (MRS o fecha de matriculación).",
        eligible: false,
        mrsValue,
        contributionYears: null,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement: null,
        percentageApplied: 0
      })
    };
  }

  if (!args.titularBirthDate) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_SIMULABLE_INVALID_DATA",
        message: "No se puede simular el componente solidario porque no se encontró titular válido.",
        eligible: false,
        mrsValue,
        contributionYears: null,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement: null,
        percentageApplied: 0
      })
    };
  }

  const calculationDate = parseIsoDateStrict(args.calculationDate);
  const titularBirthDate = parseIsoDateStrict(args.titularBirthDate);
  const matriculation = parseIsoDateStrict(matriculationDate);

  if (!calculationDate || !titularBirthDate || !matriculation) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_SIMULABLE_INVALID_DATA",
        message:
          "No se puede simular el componente solidario porque se recibieron fechas inválidas.",
        eligible: false,
        mrsValue,
        contributionYears: null,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement: null,
        percentageApplied: 0
      })
    };
  }

  const selectedRetirementAge = Math.max(0, Math.trunc(args.retirementAge));
  const retirementDateForPbs = maxDate(
    calculationDate,
    addYears(titularBirthDate, selectedRetirementAge)
  );
  const ageAtRetirement = diffWholeYears(titularBirthDate, retirementDateForPbs);
  const contributionYears = diffWholeYears(matriculation, retirementDateForPbs);

  if (ageAtRetirement < PBS_MINIMUM_AGE) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_ELIGIBLE_AGE",
        message: "El afiliado no cumple la edad mínima para componente solidario (65 años).",
        eligible: false,
        mrsValue,
        contributionYears,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement,
        percentageApplied: 0
      })
    };
  }

  if (contributionYears < PBS_MINIMUM_YEARS) {
    return {
      solidaryBenefit: 0,
      status: buildSolidaryStatus({
        code: "NOT_ELIGIBLE_MIN_CONTRIBUTION_YEARS",
        message:
          "El afiliado no cumple el mínimo de 20 años de aporte para el componente solidario.",
        eligible: false,
        mrsValue,
        contributionYears,
        requiredYears: PBS_MINIMUM_YEARS,
        ageAtRetirement,
        percentageApplied: 0
      })
    };
  }

  const baseBenefit = PBS_BASE_MRS_MULTIPLIER * mrsValue;

  if (contributionYears < PBS_FULL_YEARS) {
    const percentageApplied = contributionYears / PBS_FULL_YEARS;
    return {
      solidaryBenefit: baseBenefit * percentageApplied,
      status: buildSolidaryStatus({
        code: "APPLIED_PROPORTIONAL",
        message: "Se aplicó componente solidario proporcional según años de aporte.",
        eligible: true,
        mrsValue,
        contributionYears,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement,
        percentageApplied
      })
    };
  }

  if (contributionYears === PBS_FULL_YEARS) {
    return {
      solidaryBenefit: baseBenefit,
      status: buildSolidaryStatus({
        code: "APPLIED_FULL",
        message: "Se aplicó componente solidario completo (100%).",
        eligible: true,
        mrsValue,
        contributionYears,
        requiredYears: PBS_FULL_YEARS,
        ageAtRetirement,
        percentageApplied: 1
      })
    };
  }

  const cappedContributionYears = Math.min(contributionYears, PBS_INCREMENT_CAP_YEARS);
  const extraYears = Math.max(0, cappedContributionYears - PBS_FULL_YEARS);
  const percentageApplied = 1 + extraYears * 0.01;

  // Pendiente para futura versión: incorporar lógica específica de régimen transicional.
  return {
    solidaryBenefit: baseBenefit * percentageApplied,
    status: buildSolidaryStatus({
      code: "APPLIED_INCREMENTED",
      message:
        "Se aplicó incremento del componente solidario por años de aporte superiores al tramo completo.",
      eligible: true,
      mrsValue,
      contributionYears,
      requiredYears: PBS_FULL_YEARS,
      ageAtRetirement,
      percentageApplied
    })
  };
}

function computePpu(context: PpuContext, tMax: number): number {
  const { n } = context;
  let ppu = 0;
  const combinationLimit = 2 ** n - 1;

  for (let t = 1; t <= tMax; t += 1) {
    let accumulatedByConfiguration = 0;

    for (let i = 0; i <= combinationLimit; i += 1) {
      let port = 1;

      for (let e = 1; e <= n; e += 1) {
        const beneficiary = context.beneficiaries[e - 1];
        const alf = alphaAt(i, e);
        const gamma = gammaAt(context, e, t);

        const lxBase = getLx(beneficiary.ageMonth, beneficiary.sex);
        const lxTarget = getLx(beneficiary.ageMonth + t, beneficiary.sex);
        const liBase = getLi(beneficiary.ageMonth, beneficiary.sex);
        const liTarget = getLi(beneficiary.ageMonth + t, beneficiary.sex);
        const liAt252 = getLi(LI_REFERENCE_AGE, beneficiary.sex);
        const paiAtAge = getPai(beneficiary.ageMonth, beneficiary.sex);

        const px = safeRatio(lxTarget, lxBase);
        const pi = safeRatio(liTarget, liBase);
        const pp = liAt252 === 0 ? 0 : (paiAtAge * liTarget) / liAt252;

        const probability =
          gamma.g1 * (alf * px + (1 - alf) * (1 - px)) +
          gamma.g2 * (alf * pi + (1 - alf) * (1 - pi)) +
          gamma.g3 * (alf * pp + (1 - alf) * (1 - pp));

        port *= probability;
      }

      const gh = computeGh(context, i);
      const gc = computeGc(context, i);
      const b = determineBenefitProportion({
        n: context.n,
        cs: context.cs,
        hs: context.hs,
        gh,
        gc,
        titularAlive: alphaAt(i, 1) === 1
      });

      accumulatedByConfiguration += port * b;
    }

    ppu += accumulatedByConfiguration * INTEREST_RATE ** -(t / 12);
  }

  return ppu;
}

function alphaAt(configuration: number, beneficiaryIndex1Based: number): 0 | 1 {
  return ((configuration >> (beneficiaryIndex1Based - 1)) & 1) as 0 | 1;
}

function gammaAt(context: PpuContext, e: number, t: number): GammaState {
  const { n, cs, hs, beneficiaries } = context;
  const beneficiary = beneficiaries[e - 1];
  const titular = beneficiaries[0];

  const childGamma = (): GammaState => {
    if (beneficiary.invalid === 1) {
      return { g1: 0, g2: 1, g3: 0 };
    }

    if (t > 252 - beneficiary.ageMonth) {
      return { g1: 0, g2: 0, g3: 1 };
    }

    return { g1: 1, g2: 0, g3: 0 };
  };

  if (n === cs + hs) {
    if (hs === 0) {
      return { g1: 1, g2: 0, g3: 0 };
    }

    if (e <= cs) {
      return { g1: 1, g2: 0, g3: 0 };
    }

    return childGamma();
  }

  if (titular.invalid === 1) {
    if (hs === 0) {
      if (e === 1) {
        return { g1: 0, g2: 1, g3: 0 };
      }
      return { g1: 1, g2: 0, g3: 0 };
    }

    if (e === 1) {
      return { g1: 0, g2: 1, g3: 0 };
    }

    if (e <= cs + 1) {
      return { g1: 1, g2: 0, g3: 0 };
    }

    return childGamma();
  }

  if (hs === 0) {
    return { g1: 1, g2: 0, g3: 0 };
  }

  if (e <= cs + 1) {
    return { g1: 1, g2: 0, g3: 0 };
  }

  return childGamma();
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function computeGh(context: PpuContext, configuration: number): number {
  const { n, hs } = context;
  if (hs === 0) {
    return 0;
  }

  let sum = 0;
  for (let e = n - hs + 1; e <= n; e += 1) {
    sum += alphaAt(configuration, e);
  }
  return sum;
}

function computeGc(context: PpuContext, configuration: number): number {
  const { n, cs, hs } = context;
  if (cs === 0) {
    return 0;
  }

  let sum = 0;
  for (let e = n - cs - hs + 1; e <= n - hs; e += 1) {
    sum += alphaAt(configuration, e);
  }
  return sum;
}

export function determineBenefitProportion(args: {
  n: number;
  cs: number;
  hs: number;
  gh: number;
  gc: number;
  titularAlive: boolean;
}): number {
  const { n, cs, hs, gh, gc, titularAlive } = args;

  if (n === cs + hs) {
    if (gh > 2) {
      return 1;
    }

    if (gh === 2) {
      return 0.9;
    }

    if (gh === 1 || gc > 0) {
      return 0.7;
    }

    return 0;
  }

  if (titularAlive || gh >= 3) {
    return 1;
  }

  if (gh === 2) {
    return 0.9;
  }

  if (gh === 1 || gc > 0) {
    return 0.7;
  }

  return 0;
}

function buildHoja2AuxTrace() {
  const baseAgeMonth = 779;
  const base = getLx(baseAgeMonth, 1);
  const periodCount = 552;

  const rows: Array<{
    month: number;
    survivalRatio: number;
    discountFactor: number;
    discountedProduct: number;
  }> = [];

  let sumDiscountedProduct = 0;

  for (let month = 1; month <= periodCount; month += 1) {
    const ratio = safeRatio(getLx(baseAgeMonth + month, 1), base);
    const discount = INTEREST_RATE ** -(month / 12);
    const discounted = ratio * discount;

    rows.push({
      month,
      survivalRatio: ratio,
      discountFactor: discount,
      discountedProduct: discounted
    });

    sumDiscountedProduct += discounted;
  }

  return {
    baseAgeMonth,
    periodCount,
    sumDiscountedProduct,
    equivalentFuu: (sumDiscountedProduct / 12) * 13,
    rows
  };
}

function toNullableFiniteNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function buildSolidaryStatus(status: SolidaryStatus): SolidaryStatus {
  return status;
}

function parseIsoDateStrict(isoDate: string): Date | null {
  if (!ISO_DATE_REGEX.test(isoDate)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function diffWholeYears(start: Date, end: Date): number {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();
  const dayDiff = end.getUTCDate() - start.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }

  return Math.max(0, years);
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
