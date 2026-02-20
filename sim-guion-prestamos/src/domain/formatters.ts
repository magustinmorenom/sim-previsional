const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function formatIsoDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export function parseLocaleNumber(raw: string): number {
  const normalized = raw.replace(/\./g, "").replace(/,/g, ".").trim();
  return Number(normalized);
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} M`;
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)} K`;
  }

  return formatCurrency(value);
}
