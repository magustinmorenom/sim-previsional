import { z } from "zod";
import type { BeneficiaryInput } from "@/lib/types/simulation";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const beneficiarySchema = z.object({
  type: z.enum(["T", "C", "H"]),
  sex: z.union([z.literal(1), z.literal(2)]),
  birthDate: z
    .string()
    .regex(isoDateRegex, "birthDate debe tener formato YYYY-MM-DD"),
  invalid: z.union([z.literal(0), z.literal(1)])
});

export const simulationInputSchema = z
  .object({
    calculationDate: z
      .string()
      .regex(isoDateRegex, "calculationDate debe tener formato YYYY-MM-DD"),
    accountBalance: z.number().finite().nonnegative(),
    bov: z.number().finite().nonnegative(),
    mandatoryContribution: z.object({
      startAge: z.number().finite().nonnegative(),
      endAge: z.number().finite().nonnegative()
    }),
    voluntaryContribution: z.object({
      startAge: z.number().finite().nonnegative(),
      endAge: z.number().finite().nonnegative(),
      monthlyAmount: z.number().finite().nonnegative()
    }),
    beneficiaries: z.array(beneficiarySchema).min(1).max(56)
  })
  .superRefine((value, ctx) => {
    if (value.mandatoryContribution.endAge < value.mandatoryContribution.startAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mandatoryContribution.endAge no puede ser menor que startAge",
        path: ["mandatoryContribution", "endAge"]
      });
    }

    if (value.voluntaryContribution.endAge < value.voluntaryContribution.startAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "voluntaryContribution.endAge no puede ser menor que startAge",
        path: ["voluntaryContribution", "endAge"]
      });
    }

    const titularCount = value.beneficiaries.filter((b) => b.type === "T").length;
    if (titularCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Solo se permite un titular (T)",
        path: ["beneficiaries"]
      });
    }

    const hasSpouse = value.beneficiaries.some((b) => b.type === "C");
    const hasChild = value.beneficiaries.some((b) => b.type === "H");
    if (!hasSpouse && !hasChild && titularCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe existir al menos un beneficiario válido",
        path: ["beneficiaries"]
      });
    }
  });

export function canonicalizeBeneficiaries(
  beneficiaries: BeneficiaryInput[]
): BeneficiaryInput[] {
  const titular = beneficiaries.filter((item) => item.type === "T");
  const spouses = beneficiaries.filter((item) => item.type === "C");
  const children = beneficiaries.filter((item) => item.type === "H");

  if (titular.length > 1) {
    throw new Error("Solo se admite un titular (T)");
  }

  if (titular.length === 1) {
    return [...titular, ...spouses, ...children];
  }

  return [...spouses, ...children];
}
