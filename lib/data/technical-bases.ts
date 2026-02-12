import metadataRaw from "@/data/technical/v2025/metadata.json";
import lookupRaw from "@/data/technical/v2025/lookup-factor-table.json";
import mortalityRaw from "@/data/technical/v2025/mortality-table.json";
import type {
  LookupFactorRow,
  MortalityTableRow
} from "@/lib/types/simulation";

export const technicalMetadata = metadataRaw as {
  version: string;
  sourceWorkbook: string;
  sourceSheetMortality: string;
  sourceSheetLookup: string;
  interestRateEffectiveAnnual: number;
  xminFixed: number;
};

export const mortalityTable = mortalityRaw as MortalityTableRow[];
export const lookupFactorTable = lookupRaw as LookupFactorRow[];

const maxMortalityAge = 3000;
const maxPaiAge = 253;

const lxByAgeAndSex: number[][] = Array.from(
  { length: maxMortalityAge + 1 },
  () => [0, 0, 0]
);
const liByAgeAndSex: number[][] = Array.from(
  { length: maxMortalityAge + 1 },
  () => [0, 0, 0]
);
const paiByAgeAndSex: number[][] = Array.from(
  { length: maxPaiAge + 1 },
  () => [0, 0, 0]
);

for (const row of mortalityTable) {
  const age = row.ageMonth;

  if (age < 1 || age > maxMortalityAge) {
    continue;
  }

  lxByAgeAndSex[age][1] = row.la0;
  lxByAgeAndSex[age][2] = row.la1;
  liByAgeAndSex[age][1] = row.li0;
  liByAgeAndSex[age][2] = row.li1;

  if (age <= maxPaiAge) {
    paiByAgeAndSex[age][1] = row.pai0;
    paiByAgeAndSex[age][2] = row.pai1;
  }
}

const lookupByAge = new Map<number, number>(
  lookupFactorTable.map((item) => [item.age, item.factor])
);

export function getLx(ageMonth: number, sex: 1 | 2): number {
  if (ageMonth < 0 || ageMonth > maxMortalityAge) {
    return 0;
  }
  return lxByAgeAndSex[ageMonth][sex] ?? 0;
}

export function getLi(ageMonth: number, sex: 1 | 2): number {
  if (ageMonth < 0 || ageMonth > maxMortalityAge) {
    return 0;
  }
  return liByAgeAndSex[ageMonth][sex] ?? 0;
}

export function getPai(ageMonth: number, sex: 1 | 2): number {
  if (ageMonth < 0 || ageMonth > maxPaiAge) {
    return 0;
  }
  return paiByAgeAndSex[ageMonth][sex] ?? 0;
}

export function getLookupFactor(age: number): number | undefined {
  return lookupByAge.get(age);
}
