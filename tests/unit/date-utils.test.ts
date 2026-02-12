import { describe, expect, it } from "vitest";
import {
  diffInMonthsExcelRoutine,
  parseIsoDate,
  roundAgeYearsBy365_25
} from "@/lib/calc/date-utils";

describe("date-utils", () => {
  it("calcula edad en meses con ajuste por día negativo", () => {
    const birth = parseIsoDate("1972-04-07");
    const retirement = parseIsoDate("2031-05-19");

    const output = diffInMonthsExcelRoutine(birth, retirement);
    expect(output.months).toBe(709);
    expect(output.yearsPart).toBe(59);
    expect(output.monthsPart).toBe(1);
    expect(output.daysPart).toBe(12);
  });

  it("calcula edad redondeada en años con base 365.25", () => {
    const birth = parseIsoDate("1966-05-19");
    const calculation = parseIsoDate("2024-02-22");

    const age = roundAgeYearsBy365_25(birth, calculation);
    expect(age).toBe(58);
  });
});
