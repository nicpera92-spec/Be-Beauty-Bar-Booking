import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { sendSMS, formatUKPhoneToE164 } from "@/lib/sms";
import { formatBookingDate, formatCurrency } from "@/lib/format";
import { certificateTreatmentsText } from "@/lib/giftVoucherRules";
import {
  applyTemplate,
  buildBookLink,
  buildBookLinkForDate,
  buildInstagramLink,
  bookingLinkEmailVars,
  bookingLinkMessageVars,
  bookingSiteUrl,
  giftEmailBodyWithMessage,
  renderEmailBody,
  renderEmailSubject,
  resolveNotificationMessages,
} from "@/lib/notificationTemplates";
import { createWaitlistBookingToken } from "@/lib/waitlist-booking-token";
import { bookingCalendarEvent, buildIcs, googleMapsUrl } from "@/lib/calendarInvite";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM || "Be Beauty Bar <onboarding@resend.dev>";

async function sendResendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
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

/** Calendar file for a booking; same event ID every time so apps update rather than duplicate. */
function bookingIcsAttachment(
  booking: Parameters<typeof bookingCalendarEvent>[0],
  businessName: string,
  address: string | null | undefined
) {
  const event = bookingCalendarEvent(booking, businessName, bookingSiteUrl(`/booking/${booking.id}`), address);
  const method = event.cancelled ? "CANCEL" : "PUBLISH";
  return [
    {
      filename: "appointment.ics",
      content: Buffer.from(buildIcs(event), "utf8"),
      contentType: `text/calendar; charset=utf-8; method=${method}`,
    },
  ];
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
    cancelLink: extra?.cancelLink ?? "",
    refundDetails: extra?.refundDetails ?? "",
    calendarLink: extra?.calendarLink ?? "",
    directionsLink: extra?.directionsLink ?? "",
    previousDate: extra?.previousDate ?? "",
    previousTime: extra?.previousTime ?? "",
    reviewLink: extra?.reviewLink ?? "",
    myBookingsLink: extra?.myBookingsLink ?? bookingSiteUrl("/my-bookings"),
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
    const { buildCancelLink, buildShortCancelLink } = await import("@/lib/customerCancellation");
    const vars = bookingVars(booking, businessName, {
      instagramLink,
      cancelLink: buildCancelLink(booking.id),
      calendarLink: bookingSiteUrl(`/booking/${booking.id}#calendar`),
      directionsLink: googleMapsUrl(businessName, settings?.businessAddress),
    });
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
      cancelLink:
        booking.notifyBySMS && booking.customerPhone
          ? await buildShortCancelLink(booking.id)
          : vars.cancelLink,
      myBookingsLink: bookingSiteUrl("/my-bookings").replace(/^https:\/\//, ""),
    };

    if (booking.customerEmail && resendClient) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.bookingConfirmedCustomerSubject, vars),
        html: renderEmailBody(messages.bookingConfirmedCustomerBody, vars),
        attachments: bookingIcsAttachment(booking, businessName, settings?.businessAddress),
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
        attachments: bookingIcsAttachment(booking, businessName, settings?.businessAddress),
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

export async function sendCustomerCancellationEmails(
  bookingId: string,
  refundDetails: { customer: string; owner: string }
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
    const bookingUrl = bookingSiteUrl("/");
    const vars = bookingVars(booking, businessName, {
      technicianName: booking.technician.name,
      ...bookingLinkMessageVars(bookingUrl),
      instagramLink,
      refundDetails: refundDetails.customer,
    });
    const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
    };
    const ownerVars = { ...emailVars, refundDetails: refundDetails.owner };

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.customerCancelCustomerSubject, emailVars),
        html: renderEmailBody(messages.customerCancelCustomerBody, emailVars),
        attachments: bookingIcsAttachment(booking, businessName, settings?.businessAddress),
      });
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.customerCancelCustomerSms, smsVars);
      await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
    }

    if (resendClient && settings?.businessEmail?.trim()) {
      await sendResendEmail({
        from,
        to: settings.businessEmail.trim(),
        subject: renderEmailSubject(messages.customerCancelOwnerSubject, ownerVars),
        html: renderEmailBody(messages.customerCancelOwnerBody, ownerVars),
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
    console.error("sendCustomerCancellationEmails:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendRescheduleEmails(
  bookingId: string,
  previous: { date: string; startTime: string; endTime: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });
    if (!booking || booking.status !== "confirmed") {
      return { ok: false, error: "Booking not found or not confirmed" };
    }

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const { buildCancelLink } = await import("@/lib/customerCancellation");
    const vars = bookingVars(booking, businessName, {
      technicianName: booking.technician.name,
      instagramLink,
      cancelLink: buildCancelLink(booking.id),
      calendarLink: bookingSiteUrl(`/booking/${booking.id}#calendar`),
      directionsLink: googleMapsUrl(businessName, settings?.businessAddress),
      previousDate: formatBookingDate(previous.date, "EEEE, d MMMM yyyy"),
      previousTime: `${previous.startTime} – ${previous.endTime}`,
    });
    const smsVars = {
      ...vars,
      date: formatBookingDate(booking.date, "dd/MM/yyyy"),
      time: `${booking.startTime}-${booking.endTime}`,
      previousDate: formatBookingDate(previous.date, "dd/MM/yyyy"),
      previousTime: `${previous.startTime}-${previous.endTime}`,
    };

    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.rescheduleCustomerSubject, vars),
        html: renderEmailBody(messages.rescheduleCustomerBody, vars),
        attachments: bookingIcsAttachment(booking, businessName, settings?.businessAddress),
      });
    }

    if (booking.notifyBySMS && booking.customerPhone) {
      const smsMessage = applyTemplate(messages.rescheduleCustomerSms, smsVars);
      await sendSMS(formatUKPhoneToE164(booking.customerPhone), smsMessage);
    }

    if (resendClient && settings?.businessEmail?.trim()) {
      await sendResendEmail({
        from,
        to: settings.businessEmail.trim(),
        subject: renderEmailSubject(messages.rescheduleOwnerSubject, vars),
        html: renderEmailBody(messages.rescheduleOwnerBody, vars),
      });
    }

    const { notifyWaitlistForFreedSlot } = await import("@/lib/waitlist");
    await notifyWaitlistForFreedSlot({
      serviceId: booking.serviceId,
      technicianId: booking.technicianId,
      date: previous.date,
      startTime: previous.startTime,
      endTime: previous.endTime,
    });

    return { ok: true };
  } catch (e) {
    console.error("sendRescheduleEmails:", e);
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

    const { settings, messages, businessName, instagramLink } = await getMessages();
    const directionsLink = googleMapsUrl(businessName, settings?.businessAddress);
    const vars = bookingVars(booking, businessName, { instagramLink, directionsLink });
    const smsVars = {
      ...bookingVars(booking, businessName, { instagramLink }),
      date: formatBookingDate(booking.date, "dd/MM"),
      directionsLink: bookingSiteUrl("/directions").replace(/^https:\/\//, ""),
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

export async function sendReviewRequest(
  bookingId: string,
  reviewUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });
    if (!booking) return { ok: false, error: "Booking not found" };

    const { messages, businessName, instagramLink } = await getMessages();
    const vars = bookingVars(booking, businessName, {
      technicianName: booking.technician.name,
      instagramLink,
      reviewLink: reviewUrl,
    });

    let sent = false;
    if (booking.notifyByEmail && booking.customerEmail && resendClient) {
      const r = await sendResendEmail({
        from,
        to: booking.customerEmail,
        subject: renderEmailSubject(messages.reviewRequestCustomerSubject, vars),
        html: renderEmailBody(messages.reviewRequestCustomerBody, vars),
      });
      if (r.ok) sent = true;
    }
    if (booking.notifyBySMS && booking.customerPhone) {
      const r = await sendSMS(
        formatUKPhoneToE164(booking.customerPhone),
        applyTemplate(messages.reviewRequestCustomerSms, vars)
      );
      if (r.ok) sent = true;
    }
    return sent ? { ok: true } : { ok: false, error: "No notification channel available" };
  } catch (e) {
    console.error("sendReviewRequest:", e);
    return { ok: false, error: String(e) };
  }
}

export async function sendCustomerLoginCode(
  contact: { type: "email" | "phone"; key: string },
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const { businessName } = await getMessages();
  if (contact.type === "phone") {
    return sendSMS(
      contact.key,
      `Your ${businessName} code is ${code}. It expires in 10 minutes. If you didn't ask for it, you can ignore this text.`
    );
  }
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };
  return sendResendEmail({
    from,
    to: contact.key,
    subject: `Your ${businessName} code: ${code}`,
    html: `<p>Your code to view your bookings is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
<p>— ${escapeHtmlText(businessName)}</p>`,
  });
}

/**
 * Gift certificate emails. The gift email (with the personal message) goes to the person it's for,
 * or to the buyer when they chose to hand it over themselves; the buyer otherwise gets a receipt.
 */
export async function sendGiftVoucherEmails(voucherId: string): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };
  const voucher = await prisma.giftVoucher.findUnique({
    where: { id: voucherId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!voucher || voucher.status !== "active") return { ok: false, error: "Voucher not active" };

  const { settings, messages, businessName } = await getMessages();
  const bookUrl = bookingSiteUrl("/book");
  const recipientName = voucher.recipientName?.trim() || "someone special";
  const vars = {
    businessName,
    ...bookingLinkEmailVars(bookUrl),
    voucherCode: voucher.code,
    voucherAmount: formatCurrency(voucher.initialAmount),
    voucherMessage: voucher.message?.trim() ? `“${voucher.message.trim()}”` : "",
    voucherExpiry: voucher.expiresAt
      ? formatBookingDate(voucher.expiresAt.toISOString().slice(0, 10), "d MMMM yyyy")
      : "",
    voucherTreatments: certificateTreatmentsText(voucher.items, voucher.packageName),
    buyerName: voucher.soldInSalon ? businessName : voucher.purchaserName,
    buyerEmail: voucher.soldInSalon ? "" : voucher.purchaserEmail,
    recipientName,
  };
  const errors: string[] = [];
  const giftBody = giftEmailBodyWithMessage(messages.giftCertificateRecipientBody, voucher.message);

  const recipientEmail = voucher.recipientEmail?.trim();
  const purchaserEmail = voucher.soldInSalon ? "" : voucher.purchaserEmail?.trim();
  if (recipientEmail) {
    const r = await sendResendEmail({
      from,
      to: recipientEmail,
      subject: renderEmailSubject(messages.giftCertificateRecipientSubject, vars),
      html: renderEmailBody(giftBody, { ...vars, recipientName: voucher.recipientName?.trim() || "there" }),
    });
    if (!r.ok) errors.push(r.error ?? "recipient email failed");
  }

  if (purchaserEmail && purchaserEmail !== recipientEmail) {
    const r = recipientEmail
      ? await sendResendEmail({
          from,
          to: purchaserEmail,
          subject: renderEmailSubject(messages.giftCertificateBuyerSubject, vars),
          html: renderEmailBody(messages.giftCertificateBuyerBody, vars),
        })
      : await sendResendEmail({
          from,
          to: purchaserEmail,
          subject: renderEmailSubject(messages.giftCertificateBuyerSubject, vars),
          html:
            `<p><em>Here's the gift certificate for ${escapeHtmlText(recipientName)} — print this email or forward it to them.</em></p>` +
            renderEmailBody(giftBody, vars),
        });
    if (!r.ok) errors.push(r.error ?? "purchaser email failed");
  }

  if (!voucher.soldInSalon && settings?.businessEmail?.trim()) {
    await sendResendEmail({
      from,
      to: settings.businessEmail.trim(),
      subject: renderEmailSubject(messages.giftCertificateOwnerSubject, vars),
      html: renderEmailBody(messages.giftCertificateOwnerBody, vars),
    });
  }

  return errors.length ? { ok: false, error: errors.join("; ") } : { ok: true };
}

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendDailyScheduleEmail(params: {
  to: string;
  greetingName: string;
  date: string;
  count: number;
  scheduleText: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendClient) return { ok: false, error: "RESEND_API_KEY not set" };
  const { messages, businessName } = await getMessages();
  const vars = {
    businessName,
    technicianName: params.greetingName,
    date: formatBookingDate(params.date, "EEEE d MMMM"),
    appointmentCount: `${params.count} appointment${params.count === 1 ? "" : "s"}`,
    scheduleList: params.scheduleText,
  };
  return sendResendEmail({
    from,
    to: params.to,
    subject: renderEmailSubject(messages.dailyScheduleSubject, vars),
    html: renderEmailBody(messages.dailyScheduleBody, vars),
  });
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
  date: string;
  serviceName: string;
  technicianName: string;
};

export async function sendWaitlistNotification(
  params: WaitlistNotifyParams
): Promise<{ ok: boolean; error?: string }> {
  const { entry, date, serviceName, technicianName } = params;
  const { messages, businessName, instagramLink } = await getMessages();
  const dateLabel = formatBookingDate(date, "EEEE, d MMMM yyyy");
  const waitlistToken = await createWaitlistBookingToken({
    entryId: entry.id,
    date,
    serviceId: entry.serviceId,
    technicianId: entry.technicianId,
  });
  const bookingUrl = buildBookLinkForDate(
    entry.technicianId,
    entry.serviceId,
    date,
    waitlistToken
  );

  const vars = {
    customerName: entry.customerName,
    serviceName,
    technicianName,
    date: dateLabel,
    time: "",
    ...bookingLinkMessageVars(bookingUrl),
    depositLink: bookingUrl,
    businessName,
    instagramLink,
  };
  const emailVars = { ...vars, ...bookingLinkEmailVars(bookingUrl) };

  const smsVars = {
    ...vars,
    date: formatBookingDate(date, "dd/MM/yyyy"),
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
    time: "",
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
