import type {
  AffiliateBeneficiary,
  AffiliateSimulationContext
} from "@/lib/types/affiliate-context";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class AffiliateContextValidationError extends Error {
  issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.issues = issues;
  }
}

function readPathValue(payload: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = payload;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function readNumber(payload: Record<string, unknown>, paths: string[]): number | null {
  for (const path of paths) {
    const value = readPathValue(payload, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readString(payload: Record<string, unknown>, paths: string[]): string | null {
  for (const path of paths) {
    const value = readPathValue(payload, path);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    year <= 2099
  );
}

function parseSex(value: unknown): 1 | 2 | null {
  if (value === 1 || value === "1") {
    return 1;
  }

  if (value === 2 || value === "2") {
    return 2;
  }

  return null;
}

function parseInvalid(value: unknown): 0 | 1 | null {
  if (value === 0 || value === "0") {
    return 0;
  }

  if (value === 1 || value === "1") {
    return 1;
  }

  return null;
}

function parseType(value: unknown): "T" | "C" | "H" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "T" || normalized === "C" || normalized === "H") {
    return normalized;
  }

  return null;
}

function nextBeneficiaryOrder(type: "T" | "C" | "H", counters: Record<"C" | "H", number>): number {
  if (type === "T") {
    return 1;
  }

  if (type === "C") {
    counters.C += 1;
    return counters.C;
  }

  counters.H += 1;
  return counters.H;
}

function fallbackBeneficiaryName(type: "T" | "C" | "H", order: number): string {
  if (type === "T") {
    return "Titular";
  }

  if (type === "C") {
    return order === 1 ? "Cónyuge" : `Cónyuge ${order}`;
  }

  return order === 1 ? "Hijo" : `Hijo ${order}`;
}

function pickBeneficiaryFullName(
  row: Record<string, unknown>,
  type: "T" | "C" | "H",
  order: number
): string {
  const directName = ["fullName", "name", "nombreCompleto", "displayName"]
    .map((key) => row[key])
    .find((value) => typeof value === "string" && value.trim().length > 0);

  if (typeof directName === "string") {
    return directName.trim();
  }

  return fallbackBeneficiaryName(type, order);
}

function ageInYears(birthDateIso: string, referenceIso: string): number {
  const [birthYear, birthMonth, birthDay] = birthDateIso.split("-").map(Number);
  const [refYear, refMonth, refDay] = referenceIso.split("-").map(Number);

  let age = refYear - birthYear;
  const beforeBirthday = refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay);

  if (beforeBirthday) {
    age -= 1;
  }

  return Math.max(0, age);
}

function parseBeneficiaries(
  payload: Record<string, unknown>,
  issues: string[]
): AffiliateBeneficiary[] {
  const raw = readPathValue(payload, "beneficiaries");
  if (!Array.isArray(raw)) {
    issues.push("No se recibió beneficiaries como arreglo.");
    return [];
  }

  if (raw.length === 0) {
    issues.push("Debe existir al menos un beneficiario.");
    return [];
  }

  if (raw.length > 56) {
    issues.push("Se recibió más de 56 beneficiarios.");
  }

  const beneficiaries: AffiliateBeneficiary[] = [];
  const counters: Record<"C" | "H", number> = { C: 0, H: 0 };

  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push(`Beneficiario #${index + 1} inválido.`);
      return;
    }

    const row = item as Record<string, unknown>;
    const type = parseType(row.type);
    const sex = parseSex(row.sex);
    const birthDate = typeof row.birthDate === "string" ? row.birthDate.trim() : "";
    const invalid = parseInvalid(row.invalid);

    if (!type) {
      issues.push(`Beneficiario #${index + 1}: type inválido.`);
      return;
    }

    if (!sex) {
      issues.push(`Beneficiario #${index + 1}: sex inválido.`);
      return;
    }

    if (!isValidIsoDate(birthDate)) {
      issues.push(`Beneficiario #${index + 1}: birthDate inválido.`);
      return;
    }

    if (invalid === null) {
      issues.push(`Beneficiario #${index + 1}: invalid inválido.`);
      return;
    }

    beneficiaries.push({
      fullName: pickBeneficiaryFullName(row, type, nextBeneficiaryOrder(type, counters)),
      type,
      sex,
      birthDate,
      invalid
    });
  });

  return beneficiaries;
}

function buildFallbackAffiliateName(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "Afiliado";
  }

  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Afiliado";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function isGeneratedBeneficiaryName(name: string): boolean {
  return /^(Titular|Cónyuge(?: \d+)?|Hijo(?: \d+)?)$/.test(name);
}

function pickCalculationDate(payload: Record<string, unknown>, issues: string[]): string {
  const calculationDate = readString(payload, ["calculationDate", "calculation_date"]);
  if (!calculationDate || !isValidIsoDate(calculationDate)) {
    issues.push("No se recibió calculationDate válido.");
    return "";
  }

  return calculationDate;
}

export function mapRemoteContextToAffiliateContext(
  remotePayload: unknown,
  session: { email: string }
): AffiliateSimulationContext {
  if (!remotePayload || typeof remotePayload !== "object") {
    throw new AffiliateContextValidationError("Payload remoto inválido.", ["El payload remoto no es un objeto."]);
  }

  const payload = remotePayload as Record<string, unknown>;
  const issues: string[] = [];

  const calculationDate = pickCalculationDate(payload, issues);
  const beneficiaries = parseBeneficiaries(payload, issues);
  const titularCount = beneficiaries.filter((item) => item.type === "T").length;

  if (titularCount !== 1) {
    issues.push("La API debe devolver exactamente un titular (T). ");
  }

  const mandatoryFunds = readNumber(payload, [
    "funds.mandatory",
    "mandatoryFunds",
    "mandatory_funds",
    "accountBalanceMandatory"
  ]);
  const voluntaryFunds = readNumber(payload, [
    "funds.voluntary",
    "voluntaryFunds",
    "voluntary_funds",
    "accountBalanceVoluntary"
  ]);

  if (mandatoryFunds === null) {
    issues.push("No se recibió el fondo obligatorio.");
  }

  if (voluntaryFunds === null) {
    issues.push("No se recibió el fondo voluntario.");
  }

  const bov = readNumber(payload, ["bov", "var", "varValue", "targetValue"]);
  if (bov === null) {
    issues.push("No se recibió bov/VAR.");
  }

  const parsedEmail = readString(payload, ["affiliate.email", "email"]);
  const affiliateEmail = parsedEmail ?? session.email;

  if (!affiliateEmail) {
    issues.push("No se pudo determinar el email del afiliado.");
  }

  const remoteAffiliateName = readString(payload, [
    "affiliate.fullName",
    "affiliate.name",
    "fullName",
    "name"
  ]);

  const titular = beneficiaries.find((item) => item.type === "T");
  const titularNameForAffiliate =
    titular && !isGeneratedBeneficiaryName(titular.fullName) ? titular.fullName : null;
  const affiliateFullName =
    remoteAffiliateName ??
    titularNameForAffiliate ??
    buildFallbackAffiliateName(affiliateEmail);
  const fallbackStartAge = titular && calculationDate ? ageInYears(titular.birthDate, calculationDate) : null;

  const mandatoryStartAge = readNumber(payload, [
    "mandatoryContribution.startAge",
    "mandatoryContributionStartAge"
  ]);
  const mandatoryEndAgeDefault = readNumber(payload, [
    "mandatoryContribution.endAge",
    "mandatoryContribution.endAgeDefault",
    "mandatoryContributionEndAge"
  ]);
  const voluntaryStartAge = readNumber(payload, [
    "voluntaryContribution.startAge",
    "voluntaryContributionStartAge"
  ]);
  const voluntaryEndAgeDefault = readNumber(payload, [
    "voluntaryContribution.endAge",
    "voluntaryContribution.endAgeDefault",
    "voluntaryContributionEndAge"
  ]);

  const mandatoryStart =
    mandatoryStartAge !== null ? mandatoryStartAge : fallbackStartAge !== null ? fallbackStartAge : null;
  const mandatoryEnd = mandatoryEndAgeDefault !== null ? mandatoryEndAgeDefault : 65;
  const voluntaryStart = voluntaryStartAge !== null ? voluntaryStartAge : mandatoryStart;
  const voluntaryEnd = voluntaryEndAgeDefault !== null ? voluntaryEndAgeDefault : mandatoryEnd;

  if (mandatoryStart === null) {
    issues.push("No se pudo determinar mandatoryContribution.startAge.");
  }

  if (mandatoryEnd < 65) {
    issues.push("mandatoryContribution.endAgeDefault no puede ser menor a 65.");
  }

  if (mandatoryStart !== null && mandatoryEnd < mandatoryStart) {
    issues.push("mandatoryContribution.endAgeDefault no puede ser menor a mandatoryContribution.startAge.");
  }

  if (voluntaryStart === null) {
    issues.push("No se pudo determinar voluntaryContribution.startAge.");
  }

  if (voluntaryStart !== null && voluntaryEnd < voluntaryStart) {
    issues.push("voluntaryContribution.endAgeDefault no puede ser menor a voluntaryContribution.startAge.");
  }

  if (voluntaryEnd > mandatoryEnd) {
    issues.push("voluntaryContribution.endAgeDefault no puede superar mandatoryContribution.endAgeDefault.");
  }

  if (issues.length > 0 || mandatoryFunds === null || voluntaryFunds === null || bov === null || mandatoryStart === null || voluntaryStart === null) {
    throw new AffiliateContextValidationError(
      "No fue posible construir el contexto canónico de simulación.",
      issues
    );
  }

  return {
    affiliate: {
      email: affiliateEmail,
      fullName: affiliateFullName
    },
    calculationDate,
    accountBalance: mandatoryFunds + voluntaryFunds,
    funds: {
      mandatory: mandatoryFunds,
      voluntary: voluntaryFunds,
      total: mandatoryFunds + voluntaryFunds
    },
    bov,
    mandatoryContribution: {
      startAge: mandatoryStart,
      endAgeDefault: mandatoryEnd
    },
    voluntaryContribution: {
      startAge: voluntaryStart,
      endAgeDefault: voluntaryEnd
    },
    beneficiaries
  };
}
