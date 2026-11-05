/** Service deposit helpers — pure, safe for client components. */

/** Deposit in £ (rounded to the nearest penny) for a percentage of the price. */
export function depositFromPercent(price: number, percent: number): number {
  return Math.round(Number(price) * Number(percent)) / 100;
}

export function isValidDepositPercent(percent: unknown): percent is number {
  const n = Number(percent);
  return percent !== null && percent !== "" && Number.isFinite(n) && n > 0 && n <= 100;
}

/** Short label for admin lists, e.g. "£13.75 deposit (25%)". */
export function formatDepositPercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}
