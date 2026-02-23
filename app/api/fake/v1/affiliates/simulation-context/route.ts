import { NextResponse } from "next/server";
import { getFakeAffiliateByEmail } from "@/lib/server/fake/fake-affiliate-repository";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json(
      {
        error: "Parámetro email requerido.",
        code: "FAKE_CONTEXT_EMAIL_REQUIRED"
      },
      { status: 400 }
    );
  }

  const affiliate = getFakeAffiliateByEmail(email);

  if (!affiliate) {
    return NextResponse.json(
      {
        error: "No existe contexto fake para ese correo.",
        code: "FAKE_CONTEXT_NOT_FOUND"
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      affiliate: {
        email: affiliate.email,
        fullName: affiliate.fullName,
        fileNumber: affiliate.fileNumber
      },
      calculationDate: affiliate.calculationDate,
      funds: {
        mandatory: affiliate.funds.mandatory,
        voluntary: affiliate.funds.voluntary
      },
      bov: affiliate.bov,
      mandatoryContribution: {
        startAge: affiliate.mandatoryContribution.startAge,
        endAge: affiliate.mandatoryContribution.endAge
      },
      voluntaryContribution: {
        startAge: affiliate.voluntaryContribution.startAge,
        endAge: affiliate.voluntaryContribution.endAge
      },
      beneficiaries: affiliate.beneficiaries
    },
    { status: 200 }
  );
}
