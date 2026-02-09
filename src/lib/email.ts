import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { sendSMS, formatUKPhoneToE164 } from "@/lib/sms";
import { formatBookingDate } from "@/lib/format";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "Be Beauty Bar <onboarding@resend.dev>";

export async function sendBookingConfirmationEmails(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) {
    console.warn("RESEND_API_KEY not set; skipping confirmation emails.");
    return { ok: false, error: "Email not configured" };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking not found or not confirmed" };
    }

    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    const businessName = settings?.businessName ?? "Be Beauty Bar";
    const dayLabel = formatBookingDate(booking.date, "EEEE, d MMMM yyyy");

    if (booking.notifyByEmail && booking.customerEmail) {
      const customerSubject = `Booking confirmed – ${businessName}`;
      const customerHtml = `
        <h2>Your booking is confirmed</h2>
        <p>Hi ${booking.customerName},</p>
        <p>Your deposit has been received. Here are your booking details:</p>
        <ul>
          <li><strong>Service:</strong> ${booking.service.name}</li>
          <li><strong>Date:</strong> ${dayLabel}</li>
          <li><strong>Time:</strong> ${booking.startTime} – ${booking.endTime}</li>
        </ul>
        <p>We look forward to seeing you!</p>
        <p>— ${businessName}</p>
      `;

      await resendClient.emails.send({
        from,
        to: booking.customerEmail,
        subject: customerSubject,
        html: customerHtml,
      });
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsDayLabel = formatBookingDate(booking.date, "dd/MM/yyyy");
      const smsMessage = `Hi ${booking.customerName}, your booking at ${businessName} is confirmed. ${booking.service.name} on ${smsDayLabel} at ${booking.startTime}-${booking.endTime}. We look forward to seeing you!`;
      await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
    }

    if (settings?.businessEmail) {
      const ownerSubject = `New booking confirmed – ${booking.customerName}`;
      const ownerHtml = `
        <h2>Booking confirmed</h2>
        <p>A deposit has been received. Booking details:</p>
        <ul>
          <li><strong>Customer:</strong> ${booking.customerName}</li>
          <li><strong>Email:</strong> ${booking.customerEmail ?? "Not provided"}</li>
          <li><strong>Phone:</strong> ${booking.customerPhone ?? "Not provided"}</li>
          <li><strong>Notifications:</strong> ${booking.notifyByEmail ? "Email" : ""}${booking.notifyByEmail && booking.notifyBySMS ? " + " : ""}${booking.notifyBySMS ? "SMS" : ""}</li>
          <li><strong>Service:</strong> ${booking.service.name}</li>
          <li><strong>Date:</strong> ${dayLabel}</li>
          <li><strong>Time:</strong> ${booking.startTime} – ${booking.endTime}</li>
        </ul>
        <p>— ${businessName} booking system</p>
      `;
      await resendClient.emails.send({
        from,
        to: settings.businessEmail,
        subject: ownerSubject,
        html: ownerHtml,
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("sendBookingConfirmationEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendDepositExpiredCancellationEmails(
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.status !== "cancelled") {
      return { ok: false, error: "Booking not found or not cancelled" };
    }

    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });
    const businessName = settings?.businessName ?? "Be Beauty Bar";
    const dayLabel = formatBookingDate(booking.date, "EEEE, dd/MM/yyyy");

    const customerSubject = `Booking cancelled – ${businessName}`;
    const customerHtml = `
      <h2>Your booking has been cancelled</h2>
      <p>Hi ${booking.customerName},</p>
      <p>Your booking was automatically cancelled because the deposit was not paid within 24 hours.</p>
      <p>Details of the cancelled booking:</p>
      <ul>
        <li><strong>Service:</strong> ${booking.service.name}</li>
        <li><strong>Date:</strong> ${dayLabel}</li>
        <li><strong>Time:</strong> ${booking.startTime} – ${booking.endTime}</li>
      </ul>
      <p>If you’d still like to book, please visit our booking page and complete your deposit within 24 hours of requesting a slot.</p>
      <p>— ${businessName}</p>
    `;

    if (booking.notifyByEmail && booking.customerEmail) {
      if (resendClient) {
        await resendClient.emails.send({
          from,
          to: booking.customerEmail,
          subject: customerSubject,
          html: customerHtml,
        });
      } else {
        console.warn("RESEND_API_KEY not set; cannot send cancellation email to customer.");
      }
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsDayLabel = formatBookingDate(booking.date, "dd/MM/yyyy");
      const smsMessage = `Hi ${booking.customerName}, your booking at ${businessName} was cancelled because the deposit wasn't paid within 24 hours. ${booking.service.name} on ${smsDayLabel} at ${booking.startTime}-${booking.endTime}. To rebook, visit our booking page.`;
      const smsResult = await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
      if (!smsResult.ok) {
        console.warn("SMS not sent for cancellation notification:", smsResult.error);
      }
    }

    if (resendClient && settings?.businessEmail) {
      const ownerSubject = `Booking auto-cancelled (deposit not paid) – ${booking.customerName}`;
      const ownerHtml = `
        <h2>Booking auto-cancelled</h2>
        <p>A booking was automatically cancelled because the deposit was not paid within 24 hours.</p>
        <ul>
          <li><strong>Customer:</strong> ${booking.customerName}</li>
          <li><strong>Email:</strong> ${booking.customerEmail ?? "Not provided"}</li>
          <li><strong>Phone:</strong> ${booking.customerPhone ?? "Not provided"}</li>
          <li><strong>Notifications:</strong> ${booking.notifyByEmail ? "Email" : ""}${booking.notifyByEmail && booking.notifyBySMS ? " + " : ""}${booking.notifyBySMS ? "SMS" : ""}</li>
          <li><strong>Service:</strong> ${booking.service.name}</li>
          <li><strong>Date:</strong> ${dayLabel}</li>
          <li><strong>Time:</strong> ${booking.startTime} – ${booking.endTime}</li>
        </ul>
        <p>— ${businessName} booking system</p>
      `;
      await resendClient.emails.send({
        from,
        to: settings.businessEmail,
        subject: ownerSubject,
        html: ownerHtml,
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("sendDepositExpiredCancellationEmails:", e);
    return { ok: false, error: String(e) };
  }
}
