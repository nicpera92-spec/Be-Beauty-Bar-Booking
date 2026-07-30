/**
 * Per-technician weekly working hours.
 * Array index matches JavaScript Date.getDay(): 0 = Sunday … 6 = Saturday.
 */

export type DaySchedule = {
  isOff: boolean;
  openTime: string;
  closeTime: string;
};

export type WeeklyWorkingHours = DaySchedule[];

export const DAY_LABELS_SUN_FIRST = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Display order Mon → Sun (maps to getDay indices). */
export const WEEK_DISPLAY_ORDER: { dayIndex: number; label: string }[] = [
  { dayIndex: 1, label: "Mon" },
  { dayIndex: 2, label: "Tue" },
  { dayIndex: 3, label: "Wed" },
  { dayIndex: 4, label: "Thu" },
  { dayIndex: 5, label: "Fri" },
  { dayIndex: 6, label: "Sat" },
  { dayIndex: 0, label: "Sun" },
];

const TIME_RE = /^\d{2}:00$/;

export function isValidHourTime(value: string): boolean {
  if (!TIME_RE.test(value)) return false;
  const h = Number(value.slice(0, 2));
  return h >= 0 && h <= 23;
}

export function defaultWeeklyHours(
  openTime = "09:00",
  closeTime = "17:00"
): WeeklyWorkingHours {
  return Array.from({ length: 7 }, () => ({
    isOff: false,
    openTime,
    closeTime,
  }));
}

/**
 * Parse stored JSON into a full weekly schedule.
 * Missing / invalid days fall back to salon open/close (working).
 */
export function parseWorkingHours(
  raw: unknown,
  salonOpen = "09:00",
  salonClose = "17:00"
): WeeklyWorkingHours {
  const defaults = defaultWeeklyHours(salonOpen, salonClose);
  if (!Array.isArray(raw)) return defaults;

  return defaults.map((fallback, i) => {
    const row = raw[i];
    if (!row || typeof row !== "object") return fallback;
    const r = row as Record<string, unknown>;
    const isOff = Boolean(r.isOff);
    const openTime =
      typeof r.openTime === "string" && isValidHourTime(r.openTime)
        ? r.openTime
        : fallback.openTime;
    const closeTime =
      typeof r.closeTime === "string" && isValidHourTime(r.closeTime)
        ? r.closeTime
        : fallback.closeTime;
    return { isOff, openTime, closeTime };
  });
}

export type ResolvedDayHours =
  | { isOff: true }
  | { isOff: false; openTime: string; closeTime: string };

/**
 * Resolve open/close for a yyyy-MM-dd date.
 * When workingHours is null/undefined, every day uses salon hours.
 */
export function resolveHoursForDate(
  dateStr: string,
  workingHours: unknown,
  salonOpen = "09:00",
  salonClose = "17:00"
): ResolvedDayHours {
  const dayIndex = new Date(`${dateStr}T12:00:00`).getDay();
  if (Number.isNaN(dayIndex)) {
    return { isOff: false, openTime: salonOpen, closeTime: salonClose };
  }

  if (workingHours == null) {
    return { isOff: false, openTime: salonOpen, closeTime: salonClose };
  }

  const week = parseWorkingHours(workingHours, salonOpen, salonClose);
  const day = week[dayIndex]!;
  if (day.isOff) return { isOff: true };
  return { isOff: false, openTime: day.openTime, closeTime: day.closeTime };
}

/**
 * Validate a weekly schedule payload for API writes.
 * Returns normalized hours or an error message.
 */
export function validateWorkingHoursPayload(
  raw: unknown
): { ok: true; hours: WeeklyWorkingHours } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length !== 7) {
    return { ok: false, error: "workingHours must be an array of 7 days" };
  }

  const hours: WeeklyWorkingHours = [];
  for (let i = 0; i < 7; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      return { ok: false, error: `Invalid schedule for day ${i}` };
    }
    const r = row as Record<string, unknown>;
    const isOff = Boolean(r.isOff);
    const openTime = String(r.openTime ?? "");
    const closeTime = String(r.closeTime ?? "");
    if (!isValidHourTime(openTime) || !isValidHourTime(closeTime)) {
      return {
        ok: false,
        error: "Open and close times must be whole hours (e.g. 09:00)",
      };
    }
    if (!isOff && openTime >= closeTime) {
      return {
        ok: false,
        error: `${DAY_LABELS_SUN_FIRST[i]}: open time must be before close time`,
      };
    }
    hours.push({ isOff, openTime, closeTime });
  }
  return { ok: true, hours };
}
