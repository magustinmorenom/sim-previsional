import type {
  AffiliateBeneficiary,
  AffiliateSimulationContext,
  SolidarySourceStatus
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

  if (typeof value === "string") {
    const normalized = normalizeValue(value);
    if (normalized === "M" || normalized === "MASCULINO") {
      return 1;
    }

    if (normalized === "F" || normalized === "FEMENINO") {
      return 2;
    }
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

  if (value === true) {
    return 1;
  }

  if (value === false) {
    return 0;
  }

  if (typeof value === "string") {
    const normalized = normalizeValue(value);
    if (normalized === "TRUE" || normalized === "SI" || normalized === "S") {
      return 1;
    }

    if (normalized === "FALSE" || normalized === "NO" || normalized === "N") {
      return 0;
    }
  }

  return null;
}

function parseType(value: unknown): "T" | "C" | "H" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeValue(value);
  if (normalized === "T" || normalized === "TITULAR") {
    return "T";
  }

  if (normalized === "C" || normalized === "CONYUGE" || normalized === "PAREJA") {
    return "C";
  }

  if (normalized === "H" || normalized === "HIJO" || normalized === "HIJA") {
    return "H";
  }

  return null;
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

  const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
  const apellido = typeof row.apellido === "string" ? row.apellido.trim() : "";
  const composed = `${nombre} ${apellido}`.trim();
  if (composed.length > 0) {
    return composed;
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
  const rawLegacy = readPathValue(payload, "beneficiaries");
  if (Array.isArray(rawLegacy)) {
    return parseLegacyBeneficiaries(rawLegacy, issues);
  }

  return parseStructuredBeneficiaries(payload, issues);
}

function parseLegacyBeneficiaries(
  rawBeneficiaries: unknown[],
  issues: string[]
): AffiliateBeneficiary[] {
  if (rawBeneficiaries.length === 0) {
    issues.push("Debe existir al menos un beneficiario.");
    return [];
  }

  if (rawBeneficiaries.length > 56) {
    issues.push("Se recibió más de 56 beneficiarios.");
  }

  const beneficiaries: AffiliateBeneficiary[] = [];
  const counters: Record<"C" | "H", number> = { C: 0, H: 0 };

  rawBeneficiaries.forEach((item, index) => {
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

function parseStructuredBeneficiaries(
  payload: Record<string, unknown>,
  issues: string[]
): AffiliateBeneficiary[] {
  const beneficiaries: AffiliateBeneficiary[] = [];
  const counters: Record<"C" | "H", number> = { C: 0, H: 0 };
  const titularRaw = readPathValue(payload, "titular");

  if (!titularRaw || typeof titularRaw !== "object") {
    issues.push("No se recibió titular válido.");
    return [];
  }

  const titularRow = titularRaw as Record<string, unknown>;
  const titularSex = parseSex(titularRow.sex ?? titularRow.sexo);
  const titularBirthDateValue = titularRow.birthDate ?? titularRow.fechaNacimiento;
  const titularBirthDate =
    typeof titularBirthDateValue === "string" ? titularBirthDateValue.trim() : "";
  const titularInvalid = parseInvalid(titularRow.invalid ?? titularRow.invalido);

  if (!titularSex) {
    issues.push("Titular: sexo inválido.");
  } else if (!isValidIsoDate(titularBirthDate)) {
    issues.push("Titular: fecha de nacimiento inválida.");
  } else if (titularInvalid === null) {
    issues.push("Titular: invalidez inválida.");
  } else {
    beneficiaries.push({
      fullName: pickBeneficiaryFullName(titularRow, "T", 1),
      type: "T",
      sex: titularSex,
      birthDate: titularBirthDate,
      invalid: titularInvalid
    });
  }

  const familyRaw = readPathValue(payload, "grupoFamiliar");
  if (familyRaw === null || familyRaw === undefined) {
    return beneficiaries;
  }

  if (!Array.isArray(familyRaw)) {
    issues.push("grupoFamiliar debe ser un arreglo.");
    return beneficiaries;
  }

  familyRaw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push(`Grupo familiar #${index + 1} inválido.`);
      return;
    }

    const row = item as Record<string, unknown>;
    const type = parseType(row.relacion ?? row.type);
    const sex = parseSex(row.sex ?? row.sexo);
    const birthDateValue = row.birthDate ?? row.fechaNacimiento;
    const birthDate = typeof birthDateValue === "string" ? birthDateValue.trim() : "";
    const invalid = parseInvalid(row.invalid ?? row.invalido);

    if (!type || type === "T") {
      issues.push(`Grupo familiar #${index + 1}: relación inválida.`);
      return;
    }

    if (!sex) {
      issues.push(`Grupo familiar #${index + 1}: sexo inválido.`);
      return;
    }

    if (!isValidIsoDate(birthDate)) {
      issues.push(`Grupo familiar #${index + 1}: fecha de nacimiento inválida.`);
      return;
    }

    if (invalid === null) {
      issues.push(`Grupo familiar #${index + 1}: invalidez inválida.`);
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

  if (beneficiaries.length > 56) {
    issues.push("Se recibió más de 56 beneficiarios.");
  }

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

function normalizeNamePart(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function joinName(parts: Array<unknown>): string {
  return parts.map(normalizeNamePart).filter(Boolean).join(" ").trim();
}

function parseExternalSex(value: unknown): 1 | 2 | null {
  if (value === 1 || value === "1") {
    return 1;
  }

  if (value === 2 || value === "2") {
    return 2;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "M" || normalized === "MASCULINO" || normalized === "HOMBRE") {
    return 1;
  }

  if (normalized === "F" || normalized === "FEMENINO" || normalized === "MUJER") {
    return 2;
  }

  return null;
}

function parseExternalInvalid(value: unknown): 0 | 1 {
  if (value === 1 || value === "1" || value === true) {
    return 1;
  }

  return 0;
}

function parseExternalRelation(value: unknown): "C" | "H" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.includes("CONY")) {
    return "C";
  }

  if (normalized.includes("HIJ")) {
    return "H";
  }

  return null;
}

function toIsoDateToday(): string {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapInfoPayloadToCanonical(
  payload: Record<string, unknown>,
  sessionEmail: string
): Record<string, unknown> | null {
  const data = readPathValue(payload, "data");
  if (!data || typeof data !== "object") {
    return null;
  }

  const dataRecord = data as Record<string, unknown>;
  const titularRaw = readPathValue(dataRecord, "titular");
  if (!titularRaw || typeof titularRaw !== "object") {
    return null;
  }

  const titularRecord = titularRaw as Record<string, unknown>;

  const tipoPasividad = readString(titularRecord, ["tipoPasividad", "passivityType"]);
  if (tipoPasividad) {
    const nombre =
      joinName([titularRecord.nombre, titularRecord.apellido]) ||
      readString(titularRecord, ["fullName", "name"]) ||
      "Afiliado";
    throw new AffiliateContextValidationError(
      `${nombre} ya se encuentra con el beneficio previsional activo, no es posible realizar una simulación.`,
      [`tipoPasividad: ${tipoPasividad}`]
    );
  }

  const titularFullName =
    joinName([titularRecord.nombre, titularRecord.apellido]) ||
    readString(titularRecord, ["fullName", "name"]) ||
    "Titular";
  const titularBirthDate =
    readString(titularRecord, ["fechaNacimiento", "birthDate"]) || "";
  const titularSex = parseExternalSex(titularRecord.sexo ?? titularRecord.sex) ?? 1;
  const titularInvalid = parseExternalInvalid(
    titularRecord.invalido ?? titularRecord.invalid
  );
  const titularFileNumber =
    readString(titularRecord, ["legajo", "fileNumber", "memberNumber"]) || null;

  const beneficiaries: Array<Record<string, unknown>> = [
    {
      fullName: titularFullName,
      type: "T",
      sex: titularSex,
      birthDate: titularBirthDate,
      invalid: titularInvalid
    }
  ];

  const familyRaw = readPathValue(dataRecord, "grupoFamiliar");
  if (Array.isArray(familyRaw)) {
    familyRaw.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const row = item as Record<string, unknown>;
      const relationType = parseExternalRelation(row.relacion ?? row.type);
      if (!relationType) {
        return;
      }

      const fullName =
        joinName([row.nombre, row.apellido]) ||
        readString(row, ["fullName", "name"]) ||
        (relationType === "C" ? "Cónyuge" : "Hijo");
      const birthDate = readString(row, ["fechaNacimiento", "birthDate"]) || "";
      const invalid = parseExternalInvalid(row.invalido ?? row.invalid);
      const explicitSex = parseExternalSex(row.sexo ?? row.sex);
      const resolvedSex =
        explicitSex ??
        (relationType === "C" ? (titularSex === 1 ? 2 : 1) : titularSex);

      beneficiaries.push({
        fullName,
        type: relationType,
        sex: resolvedSex,
        birthDate,
        invalid
      });
    });
  }

  const mandatoryFunds = readNumber(dataRecord, [
    "cuentaCapitalizacion.aportesObligatorios",
    "funds.mandatory"
  ]);
  const voluntaryFunds = readNumber(dataRecord, [
    "cuentaCapitalizacion.aportesVoluntarios",
    "funds.voluntary"
  ]);
  const bov = readNumber(dataRecord, ["valorVAR", "bov", "var", "varValue", "targetValue"]);

  const calculationDate =
    readString(payload, ["calculationDate", "calculation_date"]) ??
    readString(dataRecord, ["calculationDate", "fechaCalculo"]) ??
    toIsoDateToday();

  const mrsValue = readNumber(dataRecord, ["valorMRS", "mrs", "mrsValue"]);
  const matriculationDate =
    readString(titularRecord, ["fechaMatriculacion", "matriculationDate"]) ?? null;

  const mandatoryStartAge = readNumber(dataRecord, [
    "mandatoryContribution.startAge",
    "mandatoryContributionStartAge",
    "titular.edadInicioAportesObligatorios"
  ]);
  const mandatoryEndAge = readNumber(dataRecord, [
    "mandatoryContribution.endAge",
    "mandatoryContributionEndAge",
    "titular.edadJubilacion"
  ]);
  const voluntaryStartAge = readNumber(dataRecord, [
    "voluntaryContribution.startAge",
    "voluntaryContributionStartAge",
    "titular.edadInicioAportesVoluntarios"
  ]);
  const voluntaryEndAge = readNumber(dataRecord, [
    "voluntaryContribution.endAge",
    "voluntaryContributionEndAge"
  ]);

  return {
    calculationDate,
    affiliate: {
      email: sessionEmail,
      fullName: titularFullName,
      ...(titularFileNumber ? { fileNumber: titularFileNumber } : {})
    },
    funds: {
      ...(mandatoryFunds !== null ? { mandatory: mandatoryFunds } : {}),
      ...(voluntaryFunds !== null ? { voluntary: voluntaryFunds } : {})
    },
    bov,
    beneficiaries,
    ...(mrsValue !== null || matriculationDate !== null
      ? {
          solidary: {
            ...(mrsValue !== null ? { mrsValue } : {}),
            ...(matriculationDate ? { matriculationDate } : {})
          }
        }
      : {}),
    ...(mandatoryStartAge !== null || mandatoryEndAge !== null
      ? {
          mandatoryContribution: {
            ...(mandatoryStartAge !== null ? { startAge: mandatoryStartAge } : {}),
            ...(mandatoryEndAge !== null ? { endAge: mandatoryEndAge } : {})
          }
        }
      : {}),
    ...(voluntaryStartAge !== null || voluntaryEndAge !== null
      ? {
          voluntaryContribution: {
            ...(voluntaryStartAge !== null ? { startAge: voluntaryStartAge } : {}),
            ...(voluntaryEndAge !== null ? { endAge: voluntaryEndAge } : {})
          }
        }
      : {})
  };
}

function normalizeRemotePayload(
  rawPayload: Record<string, unknown>,
  sessionEmail: string
): Record<string, unknown> {
  const canonicalFromInfo = mapInfoPayloadToCanonical(rawPayload, sessionEmail);
  if (canonicalFromInfo) {
    return canonicalFromInfo;
  }

  return rawPayload;
}

function pickCalculationDate(payload: Record<string, unknown>, issues: string[]): string {
  const calculationDate = readString(payload, [
    "calculationDate",
    "calculation_date",
    "fechaCalculo",
    "fecha_calculo"
  ]);
  if (!calculationDate || !isValidIsoDate(calculationDate)) {
    issues.push("No se recibió calculationDate válido.");
    return "";
  }

  return calculationDate;
}

function determineSolidarySourceStatus(
  mrsValue: number | null,
  matriculationDate: string | null
): SolidarySourceStatus {
  if (mrsValue !== null && matriculationDate !== null) {
    return "READY";
  }

  if (mrsValue === null && matriculationDate === null) {
    return "MISSING_BOTH";
  }

  if (mrsValue === null) {
    return "MISSING_MRS";
  }

  return "MISSING_MATRICULATION_DATE";
}

export function mapRemoteContextToAffiliateContext(
  remotePayload: unknown,
  session: { email: string }
): AffiliateSimulationContext {
  if (!remotePayload || typeof remotePayload !== "object") {
    throw new AffiliateContextValidationError("Payload remoto inválido.", ["El payload remoto no es un objeto."]);
  }

  const payload = normalizeRemotePayload(
    remotePayload as Record<string, unknown>,
    session.email
  );
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
    "accountBalanceMandatory",
    "cuentaCapitalizacion.aportesObligatorios"
  ]);
  const voluntaryFunds = readNumber(payload, [
    "funds.voluntary",
    "voluntaryFunds",
    "voluntary_funds",
    "accountBalanceVoluntary",
    "cuentaCapitalizacion.aportesVoluntarios"
  ]);
  const totalFunds = readNumber(payload, [
    "funds.total",
    "accountBalance",
    "cuentaCapitalizacion.saldoTotal",
    "saldoTotal"
  ]);

  let mandatoryFundsResolved = mandatoryFunds;
  let voluntaryFundsResolved = voluntaryFunds;

  if (mandatoryFundsResolved === null && voluntaryFundsResolved !== null && totalFunds !== null) {
    mandatoryFundsResolved = totalFunds - voluntaryFundsResolved;
  }

  if (voluntaryFundsResolved === null && mandatoryFundsResolved !== null && totalFunds !== null) {
    voluntaryFundsResolved = totalFunds - mandatoryFundsResolved;
  }

  if (mandatoryFundsResolved === null) {
    issues.push("No se recibió el fondo obligatorio.");
  }

  if (voluntaryFundsResolved === null) {
    issues.push("No se recibió el fondo voluntario.");
  }

  const bov = readNumber(payload, [
    "bov",
    "var",
    "varValue",
    "targetValue",
    "valorVAR"
  ]);
  if (bov === null) {
    issues.push("No se recibió bov/VAR.");
  }

  const mrsCandidate = readNumber(payload, [
    "solidary.mrsValue",
    "mrs",
    "mrsValue",
    "valorMRS"
  ]);
  const mrsValue = mrsCandidate !== null && mrsCandidate >= 0 ? mrsCandidate : null;

  const matriculationDateCandidate = readString(payload, [
    "solidary.matriculationDate",
    "titular.fechaMatriculacion",
    "fechaMatriculacion",
    "affiliate.matriculationDate"
  ]);
  const matriculationDate =
    matriculationDateCandidate && isValidIsoDate(matriculationDateCandidate)
      ? matriculationDateCandidate
      : null;

  const parsedEmail = readString(payload, ["affiliate.email", "email", "titular.email"]);
  const affiliateEmail = parsedEmail ?? session.email;

  if (!affiliateEmail) {
    issues.push("No se pudo determinar el email del afiliado.");
  }

  const remoteAffiliateName = readString(payload, [
    "affiliate.fullName",
    "affiliate.name",
    "fullName",
    "name",
    "titular.nombreCompleto"
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
    "mandatoryContributionStartAge",
    "titular.edadInicioAportesObligatorios"
  ]);
  const mandatoryEndAgeDefault = readNumber(payload, [
    "mandatoryContribution.endAge",
    "mandatoryContribution.endAgeDefault",
    "mandatoryContributionEndAge",
    "titular.edadJubilacion"
  ]);
  const voluntaryStartAge = readNumber(payload, [
    "voluntaryContribution.startAge",
    "voluntaryContributionStartAge",
    "titular.edadInicioAportesVoluntarios"
  ]);
  const voluntaryEndAgeDefault = readNumber(payload, [
    "voluntaryContribution.endAge",
    "voluntaryContribution.endAgeDefault",
    "voluntaryContributionEndAge"
  ]);

  const mandatoryStart =
    mandatoryStartAge !== null ? mandatoryStartAge : fallbackStartAge !== null ? fallbackStartAge : null;
  const mandatoryEnd = mandatoryEndAgeDefault !== null
    ? mandatoryEndAgeDefault
    : Math.max(65, mandatoryStart ?? 65);
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

  if (
    issues.length > 0 ||
    mandatoryFundsResolved === null ||
    voluntaryFundsResolved === null ||
    bov === null ||
    mandatoryStart === null ||
    voluntaryStart === null
  ) {
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
    accountBalance: mandatoryFundsResolved + voluntaryFundsResolved,
    funds: {
      mandatory: mandatoryFundsResolved,
      voluntary: voluntaryFundsResolved,
      total: mandatoryFundsResolved + voluntaryFundsResolved
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
    solidary: {
      mrsValue,
      matriculationDate,
      sourceStatus: determineSolidarySourceStatus(mrsValue, matriculationDate)
    },
    beneficiaries
  };
}
