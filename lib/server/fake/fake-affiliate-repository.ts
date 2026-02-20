import rawFakeAffiliates from "@/data/fake/affiliates.json";

interface FakeBeneficiary {
  fullName: string;
  type: "T" | "C" | "H";
  sex: 1 | 2;
  birthDate: string;
  invalid: 0 | 1;
}

export interface FakeAffiliateRecord {
  email: string;
  fullName: string;
  calculationDate: string;
  funds: {
    mandatory: number;
    voluntary: number;
  };
  bov: number;
  mandatoryContribution: {
    startAge: number;
    endAge: number;
  };
  voluntaryContribution: {
    startAge: number;
    endAge: number;
  };
  beneficiaries: FakeBeneficiary[];
}

interface FakeAffiliatesFile {
  affiliates: FakeAffiliateRecord[];
}

const fakeAffiliates = rawFakeAffiliates as FakeAffiliatesFile;

export function listFakeAffiliates(): FakeAffiliateRecord[] {
  return fakeAffiliates.affiliates;
}

export function getFakeAffiliateByEmail(email: string): FakeAffiliateRecord | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return (
    fakeAffiliates.affiliates.find((item) => item.email.toLowerCase() === normalizedEmail) ?? null
  );
}
