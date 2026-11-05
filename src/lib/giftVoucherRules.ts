/** Gift voucher / certificate rules — pure, safe for client components. */

export const VOUCHER_VALID_MONTHS = 12;
/** Most treatments one gift certificate can hold. */
export const MAX_CERTIFICATE_ITEMS = 10;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CertificateItemLike = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  price: number;
  status: string;
};

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * The certificate treatment that pays for booking `service`: the exact treatment bought, or the
 * same-named treatment with another technician as long as it doesn't cost more.
 */
export function matchCertificateItem<T extends CertificateItemLike>(
  items: T[],
  service: { id: string; name: string; price: number }
): T | null {
  const available = items.filter((i) => i.status === "available");
  return (
    available.find((i) => i.serviceId === service.id) ??
    available.find((i) => sameName(i.serviceName, service.name) && service.price <= i.price + 0.001) ??
    null
  );
}

export function describeCertificateItem(item: { serviceName: string; technicianName?: string | null }): string {
  return item.technicianName ? `${item.serviceName} with ${item.technicianName}` : item.serviceName;
}

/** Bullet list of the treatments on a certificate (package name first when bought as a combo). */
export function certificateTreatmentsText(
  items: { serviceName: string; technicianName?: string | null }[],
  packageName?: string | null
): string {
  const lines = items.map((i) => `• ${describeCertificateItem(i)}`);
  return packageName ? [packageName, ...lines].join("\n") : lines.join("\n");
}

export function sumPrices(items: { price: number }[]): number {
  return round2(items.reduce((sum, i) => sum + i.price, 0));
}

/**
 * What goes back to the buyer when a certificate is cancelled: the share of what they paid for
 * treatments not yet booked or used (so a combo's discount is shared fairly). Old credit vouchers
 * refund their remaining balance.
 */
export function voucherRefundAmount(voucher: {
  kind: string;
  initialAmount: number;
  balance: number;
  items: { price: number; status: string }[];
}): number {
  if (voucher.kind !== "certificate") return round2(Math.max(0, Math.min(voucher.balance, voucher.initialAmount)));
  const total = sumPrices(voucher.items);
  if (total <= 0) return 0;
  const unused = sumPrices(voucher.items.filter((i) => i.status === "available"));
  return round2((voucher.initialAmount * unused) / total);
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
