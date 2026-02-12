const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

export function maxDate(left: Date, right: Date): Date {
  return left.getTime() >= right.getTime() ? left : right;
}

export function diffInMonthsExcelRoutine(start: Date, end: Date): {
  months: number;
  yearsPart: number;
  monthsPart: number;
  daysPart: number;
} {
  let yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  let monthDiff = end.getUTCMonth() - start.getUTCMonth();
  const dayDiff = end.getUTCDate() - start.getUTCDate();

  if (dayDiff < 0) {
    monthDiff -= 1;
  }

  if (monthDiff < 0) {
    monthDiff += 12;
    yearDiff -= 1;
  }

  return {
    months: yearDiff * 12 + monthDiff,
    yearsPart: yearDiff,
    monthsPart: monthDiff,
    daysPart: dayDiff
  };
}

export function roundAgeYearsBy365_25(start: Date, end: Date): number {
  const days = (end.getTime() - start.getTime()) / DAY_MS;
  return Math.round(days / 365.25);
}
