import type { AffiliateSimulationContext } from "@/lib/types/affiliate-context";
import type { SimulationInput } from "@/lib/types/simulation";

export interface EditableSimulationValues {
  retirementAge: number;
  voluntaryEndAge: number;
  voluntaryMonthlyAmount: number;
}

export interface EditableSimulationValidationResult {
  retirementAge?: string;
  voluntaryEndAge?: string;
  voluntaryMonthlyAmount?: string;
}

export function validateEditableSimulationValues(
  context: AffiliateSimulationContext,
  values: EditableSimulationValues
): EditableSimulationValidationResult {
  const errors: EditableSimulationValidationResult = {};
  const currentAge = resolveCurrentAffiliateAge(context);

  if (!Number.isFinite(values.retirementAge) || values.retirementAge < 65) {
    errors.retirementAge = "La edad de jubilación debe ser mayor o igual a 65.";
  }

  if (values.retirementAge < context.mandatoryContribution.startAge) {
    errors.retirementAge =
      "La edad de jubilación no puede ser menor que la edad de inicio de aportes obligatorios.";
  }

  if (!Number.isFinite(values.voluntaryEndAge)) {
    errors.voluntaryEndAge = "La edad fin de aportes voluntarios es inválida.";
  }

  if (Number.isFinite(values.voluntaryEndAge) && values.voluntaryEndAge <= currentAge) {
    errors.voluntaryEndAge =
      "La edad fin de aportes voluntarios debe ser mayor que la edad actual.";
  }

  if (
    Number.isFinite(values.voluntaryEndAge) &&
    Number.isFinite(values.retirementAge) &&
    values.voluntaryEndAge > values.retirementAge
  ) {
    errors.voluntaryEndAge =
      "La edad fin de aportes voluntarios no puede superar la edad de jubilación.";
  }

  if (!Number.isFinite(values.voluntaryMonthlyAmount) || values.voluntaryMonthlyAmount < 0) {
    errors.voluntaryMonthlyAmount =
      "El aporte voluntario mensual debe ser un número mayor o igual a 0.";
  }

  return errors;
}

export function buildSimulationInputFromContext(
  context: AffiliateSimulationContext,
  values: EditableSimulationValues
): SimulationInput {
  return {
    calculationDate: context.calculationDate,
    accountBalance: context.accountBalance,
    bov: context.bov,
    mandatoryContribution: {
      startAge: context.mandatoryContribution.startAge,
      endAge: values.retirementAge
    },
    voluntaryContribution: {
      startAge: context.voluntaryContribution.startAge,
      endAge: values.voluntaryEndAge,
      monthlyAmount: values.voluntaryMonthlyAmount
    },
    beneficiaries: context.beneficiaries.map((beneficiary) => ({
      type: beneficiary.type,
      sex: beneficiary.sex,
      birthDate: beneficiary.birthDate,
      invalid: beneficiary.invalid
    }))
  };
}

function resolveCurrentAffiliateAge(context: AffiliateSimulationContext): number {
  const titular = context.beneficiaries.find((beneficiary) => beneficiary.type === "T");
  if (!titular) {
    return Math.max(0, Math.trunc(context.voluntaryContribution.startAge));
  }

  const calculated = calculateAgeFromIso(titular.birthDate);
  if (calculated === null) {
    return Math.max(0, Math.trunc(context.voluntaryContribution.startAge));
  }

  return calculated;
}

function calculateAgeFromIso(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }

  const [year, month, day] = iso.split("-").map(Number);
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
