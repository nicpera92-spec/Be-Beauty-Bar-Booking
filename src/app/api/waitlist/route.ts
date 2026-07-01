import { NextRequest, NextResponse } from "next/server";
import { addDays, isBefore, parse, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";
import { mergeWaitlistPreferences } from "@/lib/waitlist";

export async function POST(req: NextRequest) {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
      select: { waitlistEnabled: true },
    });
    if (settings?.waitlistEnabled === false) {
      return NextResponse.json({ error: "Waiting list is not available" }, { status: 403 });
    }

    const body = await req.json();
    const {
      serviceId,
      technicianId,
      customerName,
      customerEmail,
      customerPhone,
      preferredDate,
      preferredDateEnd,
      notifyByEmail,
      notifyBySMS,
    } = body;

    if (!serviceId || !technicianId || !customerName || !preferredDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const name = String(customerName).trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const email = customerEmail ? String(customerEmail).trim() : "";
    const phone = customerPhone ? String(customerPhone).trim() : "";
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Please provide an email address or phone number" },
        { status: 400 }
      );
    }
    if (!notifyByEmail && !notifyBySMS) {
      return NextResponse.json(
        { error: "Please choose at least one notification method" },
        { status: 400 }
      );
    }
    if (notifyByEmail && !email) {
      return NextResponse.json({ error: "Email is required for email notifications" }, { status: 400 });
    }
    if (notifyBySMS && !phone) {
      return NextResponse.json({ error: "Phone is required for SMS notifications" }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(preferredDate)) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    }

    const { minBookableDate, rangeEnd } = getCustomerBookableRange();
    const startDay = parse(preferredDate, "yyyy-MM-dd", new Date());
    if (isBefore(startDay, minBookableDate)) {
      return NextResponse.json({ error: "Please choose a future date" }, { status: 400 });
    }
    if (isBefore(rangeEnd, startDay)) {
      return NextResponse.json({ error: "Start date is outside the booking calendar" }, { status: 400 });
    }

    let endDate: string | null = null;
    if (preferredDateEnd != null && String(preferredDateEnd).trim() !== "") {
      const endStr = String(preferredDateEnd).trim();
      if (!dateRegex.test(endStr)) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      const endDay = parse(endStr, "yyyy-MM-dd", new Date());
      if (isBefore(endDay, startDay)) {
        return NextResponse.json(
          { error: "End date must be on or after the start date" },
          { status: 400 }
        );
      }
      if (isBefore(rangeEnd, endDay)) {
        return NextResponse.json({ error: "End date is outside the booking calendar" }, { status: 400 });
      }
      endDate = endStr === preferredDate ? null : endStr;
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { technician: { select: { active: true } } },
    });
    if (!service || service.technicianId !== technicianId || !service.active) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (!service.technician?.active) {
      return NextResponse.json({ error: "Technician is not available" }, { status: 400 });
    }

    const siblings = await prisma.waitingListEntry.findMany({
      where: {
        serviceId,
        technicianId,
        status: "active",
        OR: [
          ...(email ? [{ customerEmail: email }] : []),
          ...(phone ? [{ customerPhone: phone }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const newPreference = {
      preferredDate,
      preferredDateEnd: endDate,
      notifyEarliest: false,
    };

    let merged = newPreference;
    for (const sibling of siblings) {
      merged = mergeWaitlistPreferences(merged, {
        preferredDate: sibling.preferredDate,
        preferredDateEnd: sibling.preferredDateEnd,
        notifyEarliest: sibling.notifyEarliest,
      });
    }

    const data = {
      serviceId,
      technicianId,
      customerName: name,
      customerEmail: email || null,
      customerPhone: phone || null,
      notifyByEmail: Boolean(notifyByEmail),
      notifyBySMS: Boolean(notifyBySMS),
      preferredDate: merged.preferredDate,
      preferredDateEnd: merged.preferredDateEnd,
      notifyEarliest: merged.notifyEarliest,
      status: "active",
    };

    if (siblings.length > 0) {
      const primary = siblings[0];
      const duplicateIds = siblings.slice(1).map((s) => s.id);
      if (duplicateIds.length > 0) {
        await prisma.waitingListEntry.deleteMany({ where: { id: { in: duplicateIds } } });
      }
      const entry = await prisma.waitingListEntry.update({
        where: { id: primary.id },
        data,
      });
      return NextResponse.json({ ok: true, id: entry.id });
    }

    const entry = await prisma.waitingListEntry.create({ data });
    return NextResponse.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error("waitlist POST:", e);
    return NextResponse.json({ error: "Could not join waiting list" }, { status: 500 });
  }
}
