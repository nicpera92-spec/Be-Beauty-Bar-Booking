import { NextRequest, NextResponse } from "next/server";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendDepositExpiredCancellationEmails } from "@/lib/email";

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

  const cutoff = subHours(new Date(), 24);

  try {
    const expired = await prisma.booking.findMany({
      where: {
        status: "pending_deposit",
        createdAt: { lt: cutoff },
      },
      include: { service: true },
    });

    let cancelled = 0;
    let emailsFailed = 0;

    for (const b of expired) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { status: "cancelled" },
      });
      cancelled++;

      const result = await sendDepositExpiredCancellationEmails(b.id);
      if (!result.ok) emailsFailed++;
    }

    return NextResponse.json({
      ok: true,
      cancelled,
      emailsFailed,
      message:
        cancelled === 0
          ? "No expired pending deposits."
          : `Cancelled ${cancelled} booking(s). ${emailsFailed > 0 ? `${emailsFailed} email(s) failed.` : "Notifications sent."}`,
    });
  } catch (e) {
    console.error("cancel-expired-pending-deposits:", e);
    return NextResponse.json(
      { error: "Failed to process expired deposits" },
      { status: 500 }
    );
  }
}

/**
 * Cron endpoint: cancel bookings that have been pending_deposit for over 24 hours.
 * Sends cancellation emails to the customer and business owner.
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
