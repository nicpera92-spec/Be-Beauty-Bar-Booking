import { prisma } from "@/lib/prisma";
import {
  resolveBookingLeadSettings,
  type BookingLeadSettings,
} from "@/lib/bookingLeadPolicy";

/** Load the salon’s booking lead-time settings (defaults if unset). */
export async function loadBookingLeadSettings(): Promise<BookingLeadSettings> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: { bookingMinAdvanceDays: true, bookingCutoffTime: true },
  });
  return resolveBookingLeadSettings({
    minAdvanceDays: settings?.bookingMinAdvanceDays,
    cutoffTime: settings?.bookingCutoffTime ?? undefined,
  });
}
