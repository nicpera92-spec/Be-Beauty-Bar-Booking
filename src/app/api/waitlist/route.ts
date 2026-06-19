import { NextRequest, NextResponse } from "next/server";
import { addDays, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

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
      notifyByEmail,
      notifyBySMS,
      notifyEarliest,
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
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const minBookableDate = addDays(startOfDay(new Date()), 1);
    const preferredDay = parse(preferredDate, "yyyy-MM-dd", new Date());
    if (isBefore(preferredDay, minBookableDate)) {
      return NextResponse.json({ error: "Please choose a future date" }, { status: 400 });
    }

    const allowNotifyEarliest = isAfter(preferredDay, minBookableDate);
    const notifyEarliestValue = allowNotifyEarliest && Boolean(notifyEarliest);

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

    const existing = await prisma.waitingListEntry.findFirst({
      where: {
        serviceId,
        technicianId,
        preferredDate,
        status: "active",
        OR: [
          ...(email ? [{ customerEmail: email }] : []),
          ...(phone ? [{ customerPhone: phone }] : []),
        ],
      },
    });

    const data = {
      serviceId,
      technicianId,
      customerName: name,
      customerEmail: email || null,
      customerPhone: phone || null,
      notifyByEmail: Boolean(notifyByEmail),
      notifyBySMS: Boolean(notifyBySMS),
      preferredDate,
      notifyEarliest: notifyEarliestValue,
      status: "active",
    };

    const entry = existing
      ? await prisma.waitingListEntry.update({ where: { id: existing.id }, data })
      : await prisma.waitingListEntry.create({ data });

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error("waitlist POST:", e);
    return NextResponse.json({ error: "Could not join waiting list" }, { status: 500 });
  }
}
