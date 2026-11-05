/** Owner-editable cancellation policy — pure helpers, safe for client components. */

export const DEFAULT_CANCELLATION_REFUND_HOURS = 48;
export const MIN_CANCELLATION_REFUND_HOURS = 0;
export const MAX_CANCELLATION_REFUND_HOURS = 336;
export const MAX_CANCELLATION_POLICY_LENGTH = 5000;

/** "[hours]" is replaced with the refund window; **text** is shown in bold. */
export const DEFAULT_CANCELLATION_POLICY = [
  "You can cancel using the link in your booking confirmation email or text message.",
  "Cancel **more than [hours] hours** before your appointment and your deposit will be refunded in full.",
  "Deposits are **non-refundable** for cancellations made within [hours] hours of your appointment.",
  "Each booking can only be cancelled **once**. A cancelled booking can't be restored — to come back, please make a new booking.",
  "If you arrive more than 20 minutes late, we may need to shorten your service or reschedule your appointment. In some cases, this may be treated as a no-show and your deposit may be retained.",
].join("\n");

export function normalizeRefundHours(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_CANCELLATION_REFUND_HOURS;
  return Math.min(MAX_CANCELLATION_REFUND_HOURS, Math.max(MIN_CANCELLATION_REFUND_HOURS, n));
}

export type PolicySegment = { text: string; bold: boolean };

/** Policy points ready to render: one entry per non-empty line, split into bold/plain segments. */
export function resolveCancellationPolicy(
  stored: string | null | undefined,
  refundHours: number
): PolicySegment[][] {
  const source = stored?.trim() ? stored : DEFAULT_CANCELLATION_POLICY;
  return source
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•*]\s+/, ""))
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/\[hours\]/gi, String(refundHours))
        .split(/(\*\*[^*]+\*\*)/)
        .filter(Boolean)
        .map((part) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4
            ? { text: part.slice(2, -2), bold: true }
            : { text: part, bold: false }
        )
    );
}
