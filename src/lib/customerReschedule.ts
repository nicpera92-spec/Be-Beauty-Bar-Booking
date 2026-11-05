import { prisma } from "@/lib/prisma";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";
import { getCustomerCancelState } from "@/lib/customerCancellation";
import { DEFAULT_CANCELLATION_REFUND_HOURS, normalizeRefundHours } from "@/lib/cancellationPolicy";
import { getAvailabilityForRange, getAvailableSlotsForDay } from "@/lib/slotAvailability";

/** A customer can move a booking themselves this many times. */
export const MAX_CUSTOMER_RESCHEDULES = 2;

export type RescheduleBlockReason = "already_rescheduled" | "too_late" | "not_available";

/** Rescheduling follows the free-cancellation window and is limited to MAX_CUSTOMER_RESCHEDULES moves. */
export function getRescheduleEligibility(
  booking: { status: string; date: string; startTime: string; rescheduleCount: number },
  now: Date,
  refundHours: number
): { allowed: true } | { allowed: false; reason: RescheduleBlockReason } {
  const state = getCustomerCancelState(booking, now, refundHours);
  if (state === "non_refundable") return { allowed: false, reason: "too_late" };
  if (state !== "refundable") return { allowed: false, reason: "not_available" };
  if (booking.rescheduleCount >= MAX_CUSTOMER_RESCHEDULES) {
    return { allowed: false, reason: "already_rescheduled" };
  }
  return { allowed: true };
}

export function rescheduleDateRange(): { minDate: string; maxDate: string } {
  const range = getCustomerBookableRange();
  return { minDate: range.fromStr, maxDate: range.toStr };
}

async function loadRefundHours(): Promise<number> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { cancellationRefundHours: true },
  });
  return normalizeRefundHours(settings?.cancellationRefundHours ?? DEFAULT_CANCELLATION_REFUND_HOURS);
}

/** Days in the booking window with a free time for moving this booking (for the calendar). */
export async function getRescheduleAvailability(
  bookingId: string
): Promise<
  | { ok: true; availability: Record<string, boolean>; minDate: string; maxDate: string }
  | { ok: false; error: string }
> {
  const [booking, refundHours] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingId } }),
    loadRefundHours(),
  ]);
  if (!booking) return { ok: false, error: "Booking not found" };
  const eligibility = getRescheduleEligibility(booking, new Date(), refundHours);
  if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

  const { minDate, maxDate } = rescheduleDateRange();
  const result = await getAvailabilityForRange({
    serviceId: booking.serviceId,
    technicianId: booking.technicianId,
    from: minDate,
    to: maxDate,
    excludeBookingId: booking.id,
    skipSlot: { date: booking.date, startTime: booking.startTime },
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, availability: result.availability, minDate, maxDate };
}

export type RescheduleSlotsResult =
  | { ok: true; slots: { start: string; end: string }[] }
  | { ok: false; error: string };

/** Free slots on a day for moving this booking (its own current slot counts as free). */
export async function getRescheduleSlots(bookingId: string, date: string): Promise<RescheduleSlotsResult> {
  const [booking, refundHours] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingId } }),
    loadRefundHours(),
  ]);
  if (!booking) return { ok: false, error: "Booking not found" };
  const eligibility = getRescheduleEligibility(booking, new Date(), refundHours);
  if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

  const { minDate, maxDate } = rescheduleDateRange();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minDate || date > maxDate) {
    return { ok: true, slots: [] };
  }
  const result = await getAvailableSlotsForDay({
    date,
    serviceId: booking.serviceId,
    technicianId: booking.technicianId,
    excludeBookingId: booking.id,
  });
  if (!result.ok) return { ok: false, error: result.error };
  const slots = result.slots.filter(
    (slot) => !(date === booking.date && slot.start === booking.startTime)
  );
  return { ok: true, slots };
}

export type RescheduleResult =
  | {
      ok: true;
      booking: { date: string; startTime: string; endTime: string };
      previous: { date: string; startTime: string; endTime: string };
    }
  | { ok: false; error: string; reason?: RescheduleBlockReason | "slot_taken" };

/** Moves a confirmed booking to a new free slot, once, keeping the deposit. */
export async function rescheduleBookingByCustomer(
  bookingId: string,
  date: string,
  startTime: string
): Promise<RescheduleResult> {
  const [booking, refundHours] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingId } }),
    loadRefundHours(),
  ]);
  if (!booking) return { ok: false, error: "Booking not found" };

  const eligibility = getRescheduleEligibility(booking, new Date(), refundHours);
  if (!eligibility.allowed) {
    return { ok: false, error: "This booking can't be changed online.", reason: eligibility.reason };
  }

  const slotsResult = await getRescheduleSlots(bookingId, date);
  if (!slotsResult.ok) return { ok: false, error: slotsResult.error };
  const slot = slotsResult.slots.find((s) => s.start === startTime);
  if (!slot) {
    return {
      ok: false,
      error: "Sorry, that time is no longer available. Please choose another.",
      reason: "slot_taken",
    };
  }

  const claimed = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: "confirmed",
      rescheduleCount: { lt: MAX_CUSTOMER_RESCHEDULES },
      date: booking.date,
      startTime: booking.startTime,
    },
    data: {
      date,
      startTime: slot.start,
      endTime: slot.end,
      rescheduleCount: { increment: 1 },
      rescheduledAt: new Date(),
      reminderSentAt: null,
    },
  });
  if (claimed.count === 0) {
    return { ok: false, error: "This booking has already been changed.", reason: "already_rescheduled" };
  }

  const previous = { date: booking.date, startTime: booking.startTime, endTime: booking.endTime };
  const { sendRescheduleEmails } = await import("@/lib/email");
  const r = await sendRescheduleEmails(bookingId, previous);
  if (!r.ok) console.error("Failed to send reschedule emails:", r.error);

  return { ok: true, booking: { date, startTime: slot.start, endTime: slot.end }, previous };
}
