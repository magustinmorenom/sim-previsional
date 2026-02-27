import { NextResponse } from "next/server";
import { getFakeAffiliateByEmail } from "@/lib/server/fake/fake-affiliate-repository";

export const runtime = "nodejs";

function splitFullName(fullName: string): { nombre: string; apellido: string } {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      nombre: "Afiliado",
      apellido: "Demo"
    };
  }

  const segments = normalized.split(" ");
  if (segments.length === 1) {
    return {
      nombre: segments[0],
      apellido: ""
    };
  }

  return {
    nombre: segments[0],
    apellido: segments.slice(1).join(" ")
  };
}

function mapSexToApiValue(sex: 1 | 2): "M" | "F" {
  return sex === 1 ? "M" : "F";
}

function mapTypeToRelation(type: "T" | "C" | "H"): "TITULAR" | "CONYUGE" | "HIJO" {
  if (type === "T") {
    return "TITULAR";
  }

  if (type === "C") {
    return "CONYUGE";
  }

  return "HIJO";
}

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

  const titular = affiliate.beneficiaries.find((beneficiary) => beneficiary.type === "T");
  if (!titular) {
    return NextResponse.json(
      {
        error: "No existe titular en la ficha fake.",
        code: "FAKE_CONTEXT_TITULAR_REQUIRED"
      },
      { status: 422 }
    );
  }

  const titularNameParts = splitFullName(titular.fullName);
  const grupoFamiliar = affiliate.beneficiaries
    .filter((beneficiary) => beneficiary.type !== "T")
    .map((beneficiary) => {
      const nameParts = splitFullName(beneficiary.fullName);
      return {
        nombre: nameParts.nombre,
        apellido: nameParts.apellido,
        relacion: mapTypeToRelation(beneficiary.type),
        sexo: mapSexToApiValue(beneficiary.sex),
        fechaNacimiento: beneficiary.birthDate,
        invalido: beneficiary.invalid === 1
      };
    });

  return NextResponse.json(
    {
      success: true,
      message: "Información del afiliado obtenida exitosamente",
      data: {
        calculationDate: affiliate.calculationDate,
        titular: {
          nombre: titularNameParts.nombre,
          apellido: titularNameParts.apellido,
          legajo: affiliate.fileNumber,
          email: affiliate.email,
          sexo: mapSexToApiValue(titular.sex),
          fechaNacimiento: titular.birthDate,
          fechaMatriculacion: affiliate.matriculationDate,
          invalido: titular.invalid === 1
        },
        grupoFamiliar,
        cuentaCapitalizacion: {
          aportesObligatorios: affiliate.funds.mandatory,
          aportesVoluntarios: affiliate.funds.voluntary,
          saldoTotal: affiliate.funds.mandatory + affiliate.funds.voluntary
        },
        valorVAR: affiliate.bov,
        valorMRS: affiliate.mrsValue,
        mandatoryContribution: {
          startAge: affiliate.mandatoryContribution.startAge,
          endAge: affiliate.mandatoryContribution.endAge
        },
        voluntaryContribution: {
          startAge: affiliate.voluntaryContribution.startAge,
          endAge: affiliate.voluntaryContribution.endAge
        }
      }
    },
    { status: 200 }
  );
}
