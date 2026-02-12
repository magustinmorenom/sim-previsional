import { NextResponse } from "next/server";
import {
  lookupFactorTable,
  mortalityTable,
  technicalMetadata
} from "@/lib/data/technical-bases";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ...technicalMetadata,
      mortalityRows: mortalityTable.length,
      lookupRows: lookupFactorTable.length,
      lookupAgeRange: {
        min: lookupFactorTable[0]?.age ?? null,
        max: lookupFactorTable[lookupFactorTable.length - 1]?.age ?? null
      }
    },
    { status: 200 }
  );
}
