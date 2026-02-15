import { NextRequest, NextResponse } from "next/server";
import { addHours, parse, isWithinInterval } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendBookingReminderEmails } from "@/lib/email";

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const provided = bearer ?? querySecret;

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = addHours(now, 23);
  const windowEnd = addHours(now, 25);

  try {
    const confirmed = await prisma.booking.findMany({
      where: {
        status: "confirmed",
        reminderSentAt: null,
      },
      include: { service: true },
    });

    let sent = 0;
    let failed = 0;

    for (const b of confirmed) {
      const appointmentStart = parse(
        `${b.date}T${b.startTime}`,
        "yyyy-MM-dd'T'HH:mm",
        new Date()
      );

      if (!isWithinInterval(appointmentStart, { start: windowStart, end: windowEnd })) {
        continue;
      }

      const result = await sendBookingReminderEmails(b.id);
      if (result.ok) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { reminderSentAt: now },
        });
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      message:
        sent === 0 && failed === 0
          ? "No bookings due for 24h reminder."
          : `Sent ${sent} reminder(s).${failed > 0 ? ` ${failed} failed.` : ""}`,
    });
  } catch (e) {
    console.error("send-24h-reminders:", e);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

/**
 * Cron endpoint: send 24h reminder (email and/or SMS) to customers with confirmed
 * bookings whose appointment starts in ~24 hours.
 *
 * Protect with CRON_SECRET. Call via:
 *   Authorization: Bearer <CRON_SECRET>
 *   or ?secret=<CRON_SECRET>
 *
 * Schedule e.g. every hour (Vercel Cron, cron-job.org, etc.).
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
