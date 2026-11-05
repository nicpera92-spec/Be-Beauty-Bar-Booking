import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { BUSINESS_TIMEZONE, businessDateStr } from "@/lib/business-time";

/** UK hour (24h) when technicians get tomorrow's schedule. */
export const DAILY_SCHEDULE_HOUR = 19;

export type ScheduleBooking = {
  technicianId: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  notes: string | null;
  service: { name: string };
};

/** Groups tomorrow's live bookings by technician, earliest first. */
export function groupScheduleByTechnician<T extends ScheduleBooking>(bookings: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;
    const list = grouped.get(booking.technicianId) ?? [];
    list.push(booking);
    grouped.set(booking.technicianId, list);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return grouped;
}

/** Plain-text appointment lines for the editable schedule email (one line each, notes indented). */
export function formatScheduleLines(bookings: ScheduleBooking[]): string {
  return bookings
    .map((b) => {
      const parts = [`${b.startTime}–${b.endTime}`, b.customerName, b.service.name];
      if (b.customerPhone?.trim()) parts.push(b.customerPhone.trim());
      parts.push(b.status === "confirmed" ? "Confirmed" : "Awaiting deposit");
      const note = b.notes?.trim() ? `\n    📝 ${b.notes.trim().replace(/\s*\n\s*/g, " ")}` : "";
      return parts.join(" · ") + note;
    })
    .join("\n");
}

/** Whole-salon schedule for the owner: one section per technician. */
export function formatSalonSchedule(
  sections: { technicianName: string; bookings: ScheduleBooking[] }[]
): string {
  return sections
    .filter((s) => s.bookings.length > 0)
    .map((s) => {
      const count = s.bookings.length;
      return `${s.technicianName.toUpperCase()} (${count} appointment${count === 1 ? "" : "s"})\n${formatScheduleLines(s.bookings)}`;
    })
    .join("\n\n");
}

export async function processDailySchedules(
  now: Date = new Date(),
  options: { force?: boolean } = {}
): Promise<{ sent: number; failed: number; reason?: string }> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
    select: {
      dailyScheduleEnabled: true,
      dailyScheduleLastSentDate: true,
      adminLoginEmail: true,
      businessEmail: true,
    },
  });
  if (!settings?.dailyScheduleEnabled) return { sent: 0, failed: 0, reason: "turned off" };

  const today = businessDateStr(now);
  const ukHour = Number(formatInTimeZone(now, BUSINESS_TIMEZONE, "H"));
  if (!options.force) {
    if (ukHour !== DAILY_SCHEDULE_HOUR) return { sent: 0, failed: 0, reason: `not ${DAILY_SCHEDULE_HOUR}:00 UK` };
    if (settings.dailyScheduleLastSentDate === today) return { sent: 0, failed: 0, reason: "already sent today" };
  }

  const tomorrow = format(addDays(parse(today, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
  const [bookings, technicians] = await Promise.all([
    prisma.booking.findMany({
      where: { date: tomorrow, status: { not: "cancelled" } },
      include: { service: { select: { name: true } } },
    }),
    prisma.technician.findMany({
      select: { id: true, name: true, role: true, loginEmail: true },
    }),
  ]);

  const grouped = groupScheduleByTechnician(bookings);
  const { sendDailyScheduleEmail } = await import("@/lib/email");
  let sent = 0;
  let failed = 0;
  const record = (ok: boolean) => (ok ? sent++ : failed++);

  const owner = technicians.find((t) => t.role === "master");
  const ownerEmail =
    owner?.loginEmail?.trim() || settings.adminLoginEmail?.trim() || settings.businessEmail?.trim();

  // Each technician gets their own list; the owner gets the whole salon instead of just theirs.
  for (const technician of technicians) {
    if (technician.role === "master") continue;
    const list = grouped.get(technician.id);
    const to = technician.loginEmail?.trim();
    if (!list || list.length === 0 || !to || to === ownerEmail) continue;
    const result = await sendDailyScheduleEmail({
      to,
      greetingName: technician.name.split(" ")[0],
      date: tomorrow,
      count: list.length,
      scheduleText: formatScheduleLines(list),
    });
    record(result.ok);
  }

  const salonSections = technicians
    .map((t) => ({ technicianName: t.name, bookings: grouped.get(t.id) ?? [] }))
    .filter((s) => s.bookings.length > 0);
  const salonCount = salonSections.reduce((n, s) => n + s.bookings.length, 0);
  if (ownerEmail && salonCount > 0) {
    const result = await sendDailyScheduleEmail({
      to: ownerEmail,
      greetingName: owner?.name.split(" ")[0] ?? "there",
      date: tomorrow,
      count: salonCount,
      scheduleText: formatSalonSchedule(salonSections),
    });
    record(result.ok);
  }

  if (!options.force) {
    await prisma.businessSettings.update({
      where: { id: "default" },
      data: { dailyScheduleLastSentDate: today },
    });
  }
  return { sent, failed };
}
