import { addDays, format, parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { businessDateStr } from "@/lib/business-time";
import { contactKeyForBooking } from "@/lib/rebookReminder";
import { buildReviewTrackingLink, loadReviewedLookup } from "@/lib/reviewTracking";

/** Don't ask the same customer for a review more often than this. */
export const REVIEW_REQUEST_COOLDOWN_DAYS = 90;

type ReviewCandidate = {
  id: string;
  date: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
};

/** Visits from yesterday (and the day before, to catch up a missed run) that should be asked. */
export function reviewRequestDates(today: string): string[] {
  const day = parse(today, "yyyy-MM-dd", new Date());
  return [format(addDays(day, -1), "yyyy-MM-dd"), format(addDays(day, -2), "yyyy-MM-dd")];
}

/** One request per customer: skips anyone asked recently or already picked in this run. */
export function selectReviewCandidates<T extends ReviewCandidate>(
  visits: T[],
  recentlyAskedContacts: Set<string>
): T[] {
  const picked = new Set(recentlyAskedContacts);
  const result: T[] = [];
  for (const visit of visits) {
    const canEmail = visit.notifyByEmail && Boolean(visit.customerEmail);
    const canSms = visit.notifyBySMS && Boolean(visit.customerPhone);
    if (!canEmail && !canSms) continue;
    const key = contactKeyForBooking(visit);
    if (!key || picked.has(key)) continue;
    picked.add(key);
    result.push(visit);
  }
  return result;
}

export async function processReviewRequests(now: Date = new Date()): Promise<{
  enabled: boolean;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { reviewRequestEnabled: true, googleReviewUrl: true },
  });
  const reviewUrl = settings?.googleReviewUrl?.trim();
  if (!settings?.reviewRequestEnabled || !reviewUrl) {
    return { enabled: false, sent: 0, failed: 0, skipped: 0 };
  }

  const today = businessDateStr(now);
  const [allVisits, recentlyAsked, reviewed] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "confirmed",
        reviewRequestSentAt: null,
        date: { in: reviewRequestDates(today) },
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
    }),
    prisma.booking.findMany({
      where: { reviewRequestSentAt: { gte: addDays(now, -REVIEW_REQUEST_COOLDOWN_DAYS) } },
      select: { customerEmail: true, customerPhone: true },
    }),
    loadReviewedLookup(),
  ]);
  // Anyone who already opened the review link, or the owner marked as reviewed, is never asked again.
  const visits = allVisits.filter((v) => !reviewed(v));

  const askedKeys = new Set(
    recentlyAsked.map((b) => contactKeyForBooking(b)).filter((k): k is string => Boolean(k))
  );
  const candidates = selectReviewCandidates(visits, askedKeys);

  const { sendReviewRequest } = await import("@/lib/email");
  let sent = 0;
  let failed = 0;
  for (const booking of candidates) {
    const result = await sendReviewRequest(booking.id, buildReviewTrackingLink(booking.id));
    if (result.ok) {
      sent++;
    } else {
      failed++;
    }
    // Mark either way so a failing address isn't retried every run.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reviewRequestSentAt: now },
    });
  }

  return { enabled: true, sent, failed, skipped: allVisits.length - candidates.length };
}
