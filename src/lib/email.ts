import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { sendSMS, formatUKPhoneToE164 } from "@/lib/sms";
import { formatBookingDate } from "@/lib/format";
import {
  applyTemplate,
  buildBookLink,
  buildInstagramLink,
  bookingLinkEmailVars,
  bookingLinkMessageVars,
  bookingSiteUrl,
  renderEmailBody,
  renderEmailSubject,
  resolveNotificationMessages,
} from "@/lib/notificationTemplates";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "Be Beauty Bar <onboarding@resend.dev>";

async function sendResendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };
  const { error } = await resendClient.emails.send(params);
  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    console.error("Resend send failed:", msg);
    return { ok: false, error: msg };
  }
  return { ok: true };
}

async function getMessages() {
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
  return {
    settings,
    messages: resolveNotificationMessages(settings?.notificationMessages),
    businessName: settings?.businessName ?? "Be Beauty Bar",
    instagramLink: buildInstagramLink(settings?.instagramHandle),
  };
}

function bookingVars(
  booking: {
    customerName: string;
    date: string;
    startTime: string;
    endTime: string;
    service: { name: string };
  },
  businessName: string,
  extra?: Record<string, string>
) {
  const dayLabel = formatBookingDate(booking.date, "EEEE, d MMMM yyyy");
  const time = `${booking.startTime} – ${booking.endTime}`;
  return {
    customerName: booking.customerName,
    serviceName: booking.service.name,
    technicianName: extra?.technicianName ?? "",
    date: dayLabel,
    time,
    businessName,
    bookingLink: extra?.bookingLink ?? "",
    depositLink: extra?.depositLink ?? "",
    bookLink: extra?.bookLink ?? "",
    optOutLink: extra?.optOutLink ?? "",
    instagramLink: extra?.instagramLink ?? "",
  };
}

export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const result = await sendResendEmail({
    from,
    to: to.trim(),
    subject: "Be Beauty Bar – test email",
    html: "<p>If you received this, your email setup is working. Booking and confirmation emails will be sent from the same system.</p>",
  });
  return result;
}

export async function sendBookingCreatedEmails(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) {
    console.warn("RESEND_API_KEY not set; skipping booking-created emails.");
    return { ok: false, error: "Email not configured" };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.status !== "pending_deposit") {
      return { ok: false, error: "Booking not found or not pending deposit" };
    }

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const depositLink = `${baseUrl}/booking/${bookingId}`;
    const vars = bookingVars(booking, businessName, { depositLink, instagramLink });

    if (booking.notifyByEmail && booking.customerEmail) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.bookingCreatedCustomerSubject, vars),
        html: renderEmailBody(messages.bookingCreatedCustomerBody, vars),
      });
      if (!r.ok) return r;
    }

    if (settings?.businessEmail) {
      const r = await sendResendEmail({
        from,
        to: settings.businessEmail,
        subject: renderEmailSubject(messages.bookingCreatedOwnerSubject, vars),
        html: renderEmailBody(messages.bookingCreatedOwnerBody, vars),
      });
      if (!r.ok) return r;
    }

    return { ok: true };
  } catch (e) {
    console.error("sendBookingCreatedEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendBookingConfirmationEmails(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking not found or not confirmed" };
    }

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const vars = bookingVars(booking, businessName, { instagramLink });
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
    };

    if (booking.customerEmail && resendClient) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.bookingConfirmedCustomerSubject, vars),
        html: renderEmailBody(messages.bookingConfirmedCustomerBody, vars),
      });
      if (!r.ok) console.warn("Confirmation email failed:", r.error);
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.bookingConfirmedCustomerSms, smsVars);
      const smsResult = await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
      if (!smsResult.ok) console.warn("SMS not sent for booking confirmation:", smsResult.error);
    }

    if (settings?.businessEmail?.trim() && resendClient) {
      const r = await sendResendEmail({
        from,
        to: settings.businessEmail.trim(),
        subject: renderEmailSubject(messages.bookingConfirmedOwnerSubject, vars),
        html: renderEmailBody(messages.bookingConfirmedOwnerBody, vars),
      });
      if (!r.ok) console.warn("Owner confirmation email failed:", r.error);
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

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const vars = bookingVars(booking, businessName, { instagramLink });
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
    };

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.depositExpiredCustomerSubject, vars),
        html: renderEmailBody(messages.depositExpiredCustomerBody, vars),
      });
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.depositExpiredCustomerSms, smsVars);
      await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
    }

    if (resendClient && settings?.businessEmail) {
      await sendResendEmail({
        from,
        to: settings.businessEmail,
        subject: renderEmailSubject(messages.depositExpiredOwnerSubject, vars),
        html: renderEmailBody(messages.depositExpiredOwnerBody, vars),
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("sendDepositExpiredCancellationEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendManualCancellationEmails(
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });
    if (!booking || booking.status !== "cancelled") {
      return { ok: false, error: "Booking not found or not cancelled" };
    }

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const vars = bookingVars(booking, businessName, { instagramLink });
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
    };

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.manualCancelCustomerSubject, vars),
        html: renderEmailBody(messages.manualCancelCustomerBody, vars),
      });
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.manualCancelCustomerSms, smsVars);
      await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
    }

    if (resendClient && settings?.businessEmail?.trim()) {
      await sendResendEmail({
        from,
        to: settings.businessEmail.trim(),
        subject: renderEmailSubject(messages.manualCancelOwnerSubject, vars),
        html: renderEmailBody(messages.manualCancelOwnerBody, vars),
      });
    }

    const { notifyWaitlistForFreedSlot } = await import("@/lib/waitlist");
    await notifyWaitlistForFreedSlot({
      serviceId: booking.serviceId,
      technicianId: booking.technicianId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });

    return { ok: true };
  } catch (e) {
    console.error("sendManualCancellationEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendBookingReminderEmails(
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking not found or not confirmed" };
    }

    const { messages, businessName, instagramLink } = await getMessages();
    const vars = bookingVars(booking, businessName, { instagramLink });
    const smsVars = {
      ...bookingVars(booking, businessName, { instagramLink }),
      date: formatBookingDate(booking.date, "dd/MM"),
    };

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.reminderCustomerSubject, vars),
        html: renderEmailBody(messages.reminderCustomerBody, vars),
      });
      if (!r.ok) return r;
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.reminderCustomerSms, smsVars);
      const smsResult = await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
      if (!smsResult.ok) console.warn("SMS not sent for 24h reminder:", smsResult.error);
    }

    return { ok: true };
  } catch (e) {
    console.error("sendBookingReminderEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendRebookReminderEmails(
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking not found or not confirmed" };
    }

    const { buildRebookOptOutLink } = await import("@/lib/rebookReminder");
    const { messages, businessName, instagramLink } = await getMessages();
    const bookingUrl = bookingSiteUrl("/book");
    const optOutLink = await buildRebookOptOutLink(booking.customerEmail, booking.customerPhone);

    const vars = bookingVars(booking, businessName, {
      technicianName: booking.technician.name,
      ...bookingLinkMessageVars(bookingUrl),
      optOutLink,
      instagramLink,
    });
    const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };

    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
    };

    let sent = false;

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.rebookReminderCustomerSubject, emailVars),
        html: renderEmailBody(messages.rebookReminderCustomerBody, emailVars),
      });
      if (!r.ok) return r;
      sent = true;
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.rebookReminderCustomerSms, smsVars);
      const smsResult = await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
      if (!smsResult.ok) {
        if (!sent) return { ok: false, error: smsResult.error };
        console.warn("SMS not sent for rebook reminder:", smsResult.error);
      } else {
        sent = true;
      }
    }

    if (!sent) {
      return { ok: false, error: "No notification channel available" };
    }

    return { ok: true };
  } catch (e) {
    console.error("sendRebookReminderEmails:", e);
    return { ok: false, error: String(e) };
  }
}

type WaitlistNotifyParams = {
  entry: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    notifyByEmail: boolean;
    notifyBySMS: boolean;
    technicianId: string;
    serviceId: string;
  };
  slot: { date: string; startTime: string; endTime: string };
  serviceName: string;
  technicianName: string;
};

export async function sendWaitlistNotification(
  params: WaitlistNotifyParams
): Promise<{ ok: boolean; error?: string }> {
  const { entry, slot, serviceName, technicianName } = params;
  const { messages, businessName, instagramLink } = await getMessages();
  const dateLabel = formatBookingDate(slot.date, "EEEE, d MMMM yyyy");
  const timeLabel = `${slot.startTime} – ${slot.endTime}`;
  const bookingUrl = buildBookLink(entry.technicianId, entry.serviceId, slot.date, slot.startTime);

  const vars = {
    customerName: entry.customerName,
    serviceName,
    technicianName,
    date: dateLabel,
    time: timeLabel,
    ...bookingLinkMessageVars(bookingUrl),
    depositLink: bookingUrl,
    businessName,
    instagramLink,
  };
  const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };

  const smsVars = {
    ...vars,
    date: formatBookingDate(slot.date, "dd/MM/yyyy"),
    time: `${slot.startTime}–${slot.endTime}`,
  };

  let sent = false;

  if (entry.notifyByEmail && entry.customerEmail && resendClient) {
    const r = await sendResendEmail({
      from,
      to: entry.customerEmail,
      subject: renderEmailSubject(messages.waitlistCustomerSubject, emailVars),
      html: renderEmailBody(messages.waitlistCustomerBody, emailVars),
    });
    if (!r.ok) return r;
    sent = true;
  }

  if (entry.notifyBySMS && entry.customerPhone) {
    const smsMessage = applyTemplate(messages.waitlistCustomerSms, smsVars);
    const smsResult = await sendSMS(formatUKPhoneToE164(entry.customerPhone), smsMessage);
    if (!smsResult.ok) {
      if (!sent) return { ok: false, error: smsResult.error };
      console.warn("Waitlist SMS failed:", smsResult.error);
    } else {
      sent = true;
    }
  }

  if (!sent) {
    return { ok: false, error: "No notification channel available" };
  }

  return { ok: true };
}

export async function sendWaitlistPreviewEmail(
  to: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };

  const { messages, businessName, instagramLink } = await getMessages();
  const bookingUrl = bookingSiteUrl("/book");
  const vars = {
    customerName: "Alex",
    serviceName: "Gel Manicure",
    technicianName: "Your technician",
    date: "Saturday, 20 June 2026",
    time: "14:00 – 15:00",
    ...bookingLinkMessageVars(bookingUrl),
    depositLink: bookingUrl,
    businessName,
    instagramLink,
  };
  const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };

  return sendResendEmail({
    from,
    to: to.trim(),
    subject: renderEmailSubject(messages.waitlistCustomerSubject, emailVars),
    html: renderEmailBody(messages.waitlistCustomerBody, emailVars),
  });
}

export async function sendRebookPreviewEmail(
  to: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };

  const { messages, businessName, instagramLink } = await getMessages();
  const bookingUrl = bookingSiteUrl("/book");
  const vars = {
    customerName: "Alex",
    serviceName: "Gel Manicure",
    technicianName: "Sarah",
    date: "Saturday, 20 April 2026",
    time: "14:00 – 15:00",
    ...bookingLinkMessageVars(bookingUrl),
    depositLink: bookingUrl,
    businessName,
    optOutLink: `${bookingSiteUrl("/book").replace(/\/book$/, "")}/rebook-reminder/opt-out?token=preview`,
    instagramLink,
  };
  const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };

  return sendResendEmail({
    from,
    to: to.trim(),
    subject: renderEmailSubject(messages.rebookReminderCustomerSubject, emailVars),
    html: renderEmailBody(messages.rebookReminderCustomerBody, emailVars),
  });
}
