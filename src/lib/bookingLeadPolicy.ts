/** Owner-editable booking lead time — pure helpers, safe for client components. */

export const DEFAULT_BOOKING_MIN_ADVANCE_DAYS = 1;
export const DEFAULT_BOOKING_CUTOFF_TIME = "18:00";
export const MIN_BOOKING_ADVANCE_DAYS = 0;
export const MAX_BOOKING_ADVANCE_DAYS = 30;

export type BookingLeadSettings = {
  minAdvanceDays: number;
  /** UK clock time HH:mm — after this, the earliest day moves one day further out. */
  cutoffTime: string;
};

export function normalizeBookingMinAdvanceDays(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_BOOKING_MIN_ADVANCE_DAYS;
  return Math.min(MAX_BOOKING_ADVANCE_DAYS, Math.max(MIN_BOOKING_ADVANCE_DAYS, n));
}

/** Accepts HH:mm; falls back to the default when invalid. */
export function normalizeBookingCutoffTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return DEFAULT_BOOKING_CUTOFF_TIME;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return DEFAULT_BOOKING_CUTOFF_TIME;
  }
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function resolveBookingLeadSettings(
  partial?: Partial<BookingLeadSettings> | null
): BookingLeadSettings {
  return {
    minAdvanceDays: normalizeBookingMinAdvanceDays(partial?.minAdvanceDays),
    cutoffTime: normalizeBookingCutoffTime(partial?.cutoffTime),
  };
}
