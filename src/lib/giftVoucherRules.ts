/** Gift voucher rules — pure, safe for client components. */

export const VOUCHER_PRESET_AMOUNTS = [25, 50, 75, 100];
export const VOUCHER_MIN_AMOUNT = 10;
export const VOUCHER_MAX_AMOUNT = 500;
export const VOUCHER_VALID_MONTHS = 12;
/** Stripe's smallest card charge; a voucher never leaves less than this to pay by card. */
export const MIN_CARD_CHARGE = 0.5;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatVoucherCode(raw: string): string {
  return `BB-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function randomVoucherCodeFrom(bytes: Uint8Array): string {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return formatVoucherCode(raw);
}

/** Accepts "bb-abcd-efgh", "BBABCDEFGH", "abcd efgh" etc. Returns the canonical code or null. */
export function normalizeVoucherCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("BB") && compact.length === 10) compact = compact.slice(2);
  if (compact.length !== 8 || [...compact].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return formatVoucherCode(compact);
}

export function isValidVoucherAmount(amount: unknown): amount is number {
  const n = Number(amount);
  return Number.isFinite(n) && Number.isInteger(n) && n >= VOUCHER_MIN_AMOUNT && n <= VOUCHER_MAX_AMOUNT;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * How much of a deposit a voucher pays. Covers it in full when the balance allows. If the voucher
 * falls short by less than Stripe's minimum card charge, the voucher is used in full and the few
 * pence move to the balance paid at the salon (`salon`) — so the booking confirms without a card.
 */
export function voucherDepositSplit(
  deposit: number,
  voucherBalance: number
): { voucher: number; card: number; salon: number } {
  const dep = round2(Math.max(0, deposit));
  const balance = round2(Math.max(0, voucherBalance));
  if (dep === 0 || balance === 0) return { voucher: 0, card: dep, salon: 0 };
  if (balance >= dep) return { voucher: dep, card: 0, salon: 0 };
  const shortfall = round2(dep - balance);
  if (shortfall < MIN_CARD_CHARGE) return { voucher: balance, card: 0, salon: shortfall };
  return { voucher: balance, card: shortfall, salon: 0 };
}
