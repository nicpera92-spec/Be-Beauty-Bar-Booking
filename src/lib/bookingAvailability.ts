import { parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  countCategoryOverlaps,
  DEFAULT_CATEGORY_RULES,
  timeRangesOverlap,
} from "@/lib/categoryCapacity";

export async function getMaxConcurrentForCategory(category: string): Promise<number> {
  const rule = await prisma.categoryCapacityRule.findUnique({ where: { category } });
  if (rule) return rule.maxConcurrent;
  const fallback = DEFAULT_CATEGORY_RULES.find((r) => r.category === category);
  return fallback?.maxConcurrent ?? 1;
}

export async function isBookingSlotAvailable(params: {
  date: string;
  startTime: string;
  endTime: string;
  technicianId: string;
  serviceCategory: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const day = parse(params.date, "yyyy-MM-dd", new Date());
  const bookings = await prisma.booking.findMany({
    where: { date: params.date, status: { not: "cancelled" } },
    select: {
      technicianId: true,
      startTime: true,
      endTime: true,
      service: { select: { category: true } },
    },
  });

  const technicianOverlap = bookings.some(
    (b) =>
      b.technicianId === params.technicianId &&
      timeRangesOverlap(day, params.startTime, params.endTime, b.startTime, b.endTime)
  );
  if (technicianOverlap) {
    return { ok: false, reason: "This technician is already booked at that time." };
  }

  const maxConcurrent = await getMaxConcurrentForCategory(params.serviceCategory);
  const categoryOverlaps = countCategoryOverlaps(
    bookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      service: { category: b.service.category },
    })),
    params.serviceCategory,
    day,
    params.startTime,
    params.endTime
  );
  if (categoryOverlaps >= maxConcurrent) {
    return {
      ok: false,
      reason: `Only ${maxConcurrent} ${params.serviceCategory.replace(/-/g, " ")} appointment(s) can run at this time. Please choose another slot.`,
    };
  }

  return { ok: true };
}
