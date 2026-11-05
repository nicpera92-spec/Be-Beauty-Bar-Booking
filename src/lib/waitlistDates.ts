/** Pure waitlist date helpers — safe to import from client components. */

export type WaitlistDatePreference = {
  preferredDate: string;
  preferredDateEnd: string | null;
  notifyEarliest: boolean;
};

/** Inclusive end of the customer's requested date range. */
export function waitlistRangeEnd(entry: WaitlistDatePreference): string {
  if (entry.preferredDateEnd && entry.preferredDateEnd >= entry.preferredDate) {
    return entry.preferredDateEnd;
  }
  return entry.preferredDate;
}

export function waitlistHasExplicitRange(entry: WaitlistDatePreference): boolean {
  return Boolean(entry.preferredDateEnd && entry.preferredDateEnd > entry.preferredDate);
}

export function formatWaitlistDateRange(
  entry: WaitlistDatePreference,
  formatDate: (dateStr: string) => string
): string {
  if (waitlistHasExplicitRange(entry)) {
    return `${formatDate(entry.preferredDate)} – ${formatDate(waitlistRangeEnd(entry))}`;
  }
  if (entry.notifyEarliest) {
    return `${formatDate(entry.preferredDate)} · earlier dates too`;
  }
  return formatDate(entry.preferredDate);
}
