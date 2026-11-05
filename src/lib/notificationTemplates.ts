import {
  DEFAULT_NOTIFICATION_MESSAGES,
  type NotificationMessages,
} from "@/lib/notificationDefaults";
import {
  MESSAGE_TOKEN_CLOSE,
  MESSAGE_TOKEN_OPEN,
  getMessageTokenRegex,
  migrateTokensToStorageFormat,
} from "@/lib/messageEditorTokens";

export const BOOKING_LINK_DISPLAY = "bbbar.co.uk";

/** Full booking URL used behind the scenes for email links. */
export function bookingSiteUrl(path = "/book"): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || `https://${BOOKING_LINK_DISPLAY}`).replace(
    /\/$/,
    ""
  );
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** What customers see for booking links in SMS and the message editor preview. */
export function bookingLinkMessage(_url?: string): string {
  return BOOKING_LINK_DISPLAY;
}

/** Plain-text email fragment — linkify turns this into a clickable bbbar.co.uk link. */
export function bookingLinkEmail(url: string): string {
  return `${BOOKING_LINK_DISPLAY}: ${url}`;
}

export function bookingLinkMessageVars(url: string): {
  bookLink: string;
  bookingLink: string;
} {
  const display = bookingLinkMessage(url);
  return { bookLink: display, bookingLink: display };
}

export function bookingLinkEmailVars(url: string): {
  bookLink: string;
  bookingLink: string;
} {
  const email = bookingLinkEmail(url);
  return { bookLink: email, bookingLink: email };
}

/** Maps internal variable names to the friendly label shown in the editor. */
export const PLACEHOLDER_LABELS: Record<string, string> = {
  customerName: "Customer name",
  serviceName: "Service",
  technicianName: "Technician",
  date: "Date",
  time: "Time",
  businessName: "Salon name",
  bookLink: "Booking link",
  bookingLink: "Booking link",
  depositLink: "Pay deposit link",
  optOutLink: "Opt out link",
  instagramLink: "Instagram link",
  cancelLink: "Cancel link",
  refundDetails: "Refund details",
  calendarLink: "Calendar link",
  directionsLink: "Directions link",
  previousDate: "Previous date",
  previousTime: "Previous time",
  reviewLink: "Review link",
  scheduleList: "Schedule",
  appointmentCount: "Appointment count",
  voucherCode: "Certificate code",
  voucherAmount: "Certificate value",
  voucherMessage: "Gift message",
  voucherExpiry: "Certificate expiry",
  voucherTreatments: "Treatments",
  buyerName: "Buyer name",
  buyerEmail: "Buyer email",
  recipientName: "Recipient name",
  myBookingsLink: "My bookings link",
};

const LABEL_TO_VAR: Record<string, string> = {
  "Customer name": "customerName",
  Service: "serviceName",
  Technician: "technicianName",
  Date: "date",
  Time: "time",
  "Salon name": "businessName",
  "Booking link": "bookLink",
  "Pay deposit link": "depositLink",
  "Opt out link": "optOutLink",
  "Instagram link": "instagramLink",
  "Cancel link": "cancelLink",
  "Refund details": "refundDetails",
  "Calendar link": "calendarLink",
  "Directions link": "directionsLink",
  "Previous date": "previousDate",
  "Previous time": "previousTime",
  "Review link": "reviewLink",
  Schedule: "scheduleList",
  "Appointment count": "appointmentCount",
  "Certificate code": "voucherCode",
  "Certificate value": "voucherAmount",
  "Gift message": "voucherMessage",
  "Certificate expiry": "voucherExpiry",
  Treatments: "voucherTreatments",
  "Voucher code": "voucherCode",
  "Voucher amount": "voucherAmount",
  "Voucher message": "voucherMessage",
  "Voucher expiry": "voucherExpiry",
  "Buyer name": "buyerName",
  "Buyer email": "buyerEmail",
  "Recipient name": "recipientName",
  "My bookings link": "myBookingsLink",
};

export function friendlyToken(label: string): string {
  return `${MESSAGE_TOKEN_OPEN}${label}${MESSAGE_TOKEN_CLOSE}`;
}

function labelFromTokenMatch(match: RegExpExecArray): string {
  if (match[1] ?? match[2] ?? match[3]) {
    return (match[1] ?? match[2] ?? match[3]) as string;
  }
  if (match[4]) {
    return PLACEHOLDER_LABELS[match[4]] ?? match[4];
  }
  return "";
}

// Legacy highlight helper removed — editor uses contenteditable spans in messageEditorDom.ts

export type MessageInsertTag = {
  label: string;
  token: string;
  hint?: string;
  /** Message group ids where this detail is filled in; omitted = every group. */
  groups?: string[];
};

function tag(label: string, hint?: string, groups?: string[]): MessageInsertTag {
  return { label, token: friendlyToken(label), hint, groups };
}

const BOOKING_GROUPS = [
  "booking-request",
  "booking-confirmed",
  "manual-cancel",
  "customer-cancel",
  "customer-reschedule",
  "deposit-expired",
  "reminder",
  "waitlist",
  "rebook-reminder",
  "review-request",
];

/** Friendly labels — shown as buttons in Settings → Messages. */
export const MESSAGE_INSERT_TAGS: MessageInsertTag[] = [
  tag("Customer name", undefined, BOOKING_GROUPS),
  tag("Service", undefined, BOOKING_GROUPS),
  tag("Technician", undefined, [...BOOKING_GROUPS, "daily-schedule"]),
  tag("Date", undefined, [...BOOKING_GROUPS, "daily-schedule"]),
  tag("Time", undefined, BOOKING_GROUPS),
  tag("Salon name"),
  tag("Booking link", "Shows as bbbar.co.uk"),
  tag("Pay deposit link", "Link to pay deposit", ["booking-request"]),
  tag("Opt out link", "Link to stop rebook reminders", ["rebook-reminder"]),
  tag("Instagram link", "Link to your Instagram profile"),
  tag("Cancel link", "Link to change or cancel the booking", ["booking-confirmed", "customer-reschedule"]),
  tag("Refund details", "Whether the deposit was refunded", ["customer-cancel"]),
  tag("Calendar link", "Add the appointment to their calendar", ["booking-confirmed", "customer-reschedule"]),
  tag("Directions link", "Google Maps directions to the salon", [
    "booking-confirmed",
    "customer-reschedule",
    "reminder",
  ]),
  tag("My bookings link", "Their My Bookings page (all their appointments)", [
    "booking-confirmed",
    "customer-reschedule",
    "reminder",
  ]),
  tag("Previous date", "Original date before the customer moved it", ["customer-reschedule"]),
  tag("Previous time", "Original time before the customer moved it", ["customer-reschedule"]),
  tag("Review link", "Your Google review page", ["review-request"]),
  tag("Schedule", "The list of appointments", ["daily-schedule"]),
  tag("Appointment count", "e.g. 3 appointments", ["daily-schedule"]),
  tag("Treatments", "The treatments on the certificate", ["gift-voucher"]),
  tag("Certificate code", "e.g. BB-ABCD-2345", ["gift-voucher"]),
  tag("Gift message", "The buyer's personal message", ["gift-voucher"]),
  tag("Certificate value", "What was paid, e.g. £65", ["gift-voucher"]),
  tag("Certificate expiry", "Date the certificate expires", ["gift-voucher"]),
  tag("Buyer name", "Who bought the certificate", ["gift-voucher"]),
  tag("Buyer email", "Buyer's email address", ["gift-voucher"]),
  tag("Recipient name", "Who the certificate is for", ["gift-voucher"]),
];

export function insertTagsForGroup(groupId: string): MessageInsertTag[] {
  return MESSAGE_INSERT_TAGS.filter((t) => !t.groups || t.groups.includes(groupId));
}

export function toFriendlyPlaceholders(template: string): string {
  let text = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const label = PLACEHOLDER_LABELS[key];
    return label ? friendlyToken(label) : `{{${key}}}`;
  });
  return migrateTokensToStorageFormat(text);
}

function substituteTokenLabel(label: string, vars: Record<string, string>): string {
  const key = LABEL_TO_VAR[label.trim()];
  return key ? (vars[key] ?? "") : label;
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  const tokenRe = getMessageTokenRegex();
  const withFriendly = template.replace(tokenRe, (...parts) => {
    const match = parts as unknown as RegExpExecArray;
    if (match[4]) return vars[match[4]] ?? "";
    return substituteTokenLabel(labelFromTokenMatch(match), vars);
  });
  return withFriendly.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export const MESSAGE_PREVIEW_SAMPLE: Record<string, string> = {
  customerName: "Alex",
  serviceName: "Gel Manicure",
  technicianName: "Sarah",
  date: "Saturday, 20 June 2026",
  time: "14:00 – 15:00",
  businessName: "Be Beauty Bar",
  bookLink: BOOKING_LINK_DISPLAY,
  bookingLink: BOOKING_LINK_DISPLAY,
  depositLink: "https://bbbar.co.uk/booking/example",
  optOutLink: "https://bbbar.co.uk/rebook-reminder/opt-out?token=example",
  instagramLink: "https://instagram.com/bebeauty.bar",
  cancelLink: "https://bbbar.co.uk/cancel/example/abc123",
  calendarLink: "https://bbbar.co.uk/booking/example#calendar",
  directionsLink: "https://maps.google.com/?q=Be%20Beauty%20Bar%2C%2033%20Castle%20St%2C%20Swansea%20SA1%201HZ",
  previousDate: "Friday, 19 June 2026",
  previousTime: "11:00 – 12:00",
  reviewLink: "https://g.page/r/example/review",
  scheduleList:
    "09:30–11:30 · Alex Smith · Lash Extensions – Any Style · 07700 900123 · Confirmed\n14:00–15:00 · Sam Jones · Gel Manicure · 07700 900456 · Awaiting deposit\n    📝 Allergic to latex",
  appointmentCount: "2 appointments",
  voucherCode: "BB-ABCD-2345",
  voucherAmount: "£65",
  voucherMessage: "“Happy birthday! Enjoy some pampering x”",
  voucherExpiry: "5 November 2027",
  voucherTreatments: "• Gel Manicure with Sarah\n• Lash Lift with Sarah",
  buyerName: "Jamie",
  buyerEmail: "jamie@example.com",
  recipientName: "Alex",
  myBookingsLink: "https://bbbar.co.uk/my-bookings",
  refundDetails:
    "Your deposit of £20.00 has been refunded to your original payment method. Please allow 5–10 working days for it to appear.",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert legacy HTML templates saved before the plain-text editor. */
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, (_, url, label) => {
      const t = (label as string).trim();
      return t && t !== url ? `${t}: ${url}` : url;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function linkifyEscapedHtml(escaped: string): string {
  const withLabels = escaped.replace(
    /([^:\n<>\s][^:\n<>]*?):\s*(https?:\/\/[^\s<&]+)/g,
    '<a href="$2">$1</a>'
  );
  const withHttps = withLabels.replace(
    /(?<!href=")(https?:\/\/[^\s<&]+)/g,
    '<a href="$1">$1</a>'
  );
  const bookingLabel = BOOKING_LINK_DISPLAY.replace(/\./g, "\\.");
  return withHttps.replace(
    new RegExp(`(?<!href=")(?<!">)${bookingLabel}(?![^<]*</a>)`, "g"),
    `<a href="${bookingSiteUrl("/book")}">${BOOKING_LINK_DISPLAY}</a>`
  );
}

/** Turn plain text (after placeholders are filled) into a simple HTML email. */
export function plainTextToEmailHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "<p></p>";

  const paragraphs = trimmed.split(/\n\n+/);
  return paragraphs
    .map((paragraph) => {
      const withBreaks = escapeHtml(paragraph).replace(/\n/g, "<br>");
      return `<p>${linkifyEscapedHtml(withBreaks)}</p>`;
    })
    .join("");
}

export function renderEmailSubject(template: string, vars: Record<string, string>): string {
  return applyTemplate(template, vars);
}

export function renderEmailBody(template: string, vars: Record<string, string>): string {
  const plain = applyTemplate(template, vars);
  if (plain.includes("<") && plain.includes(">") && /<[a-z][\s\S]*>/i.test(plain)) {
    return plain;
  }
  return plainTextToEmailHtml(plain);
}

function normalizeStoredMessage(value: string, fallback: string): string {
  let text = value || fallback;
  if (text.includes("<") && /<[a-z][\s\S]*>/i.test(text)) {
    text = htmlToPlainText(text);
  }
  return toFriendlyPlaceholders(text);
}

function normalizeAllNotificationMessages(
  messages: NotificationMessages
): NotificationMessages {
  const keys = Object.keys(messages) as (keyof NotificationMessages)[];
  const normalized = { ...messages };
  for (const key of keys) {
    normalized[key] = normalizeStoredMessage(normalized[key], messages[key]);
  }
  return normalized;
}

/** Adds a paragraph just above the "— Salon name" sign-off (or at the end if there isn't one). */
export function insertBeforeSignOff(body: string, paragraph: string): string {
  const trimmed = body.trimEnd();
  const signOff = trimmed.lastIndexOf("\n\n— ");
  if (signOff === -1) return `${trimmed}\n\n${paragraph}`;
  return `${trimmed.slice(0, signOff)}\n\n${paragraph}${trimmed.slice(signOff)}`;
}

/** The gift email must carry the buyer's personal message even if the template was edited without it. */
export function giftEmailBodyWithMessage(body: string, message: string | null | undefined): string {
  if (!message?.trim()) return body;
  const hasMessage = [friendlyToken("Gift message"), friendlyToken("Voucher message")].some((t) => body.includes(t));
  return hasMessage ? body : insertBeforeSignOff(body, friendlyToken("Gift message"));
}

/** Confirmation messages must always carry the customer's cancel link (and the email calendar + directions links). */
function ensureCancelLink(messages: NotificationMessages): NotificationMessages {
  const token = friendlyToken("Cancel link");
  const calendarToken = friendlyToken("Calendar link");
  const directionsToken = friendlyToken("Directions link");
  const result = { ...messages };
  const ensureInBody = (needle: string, paragraph: string) => {
    if (!result.bookingConfirmedCustomerBody.includes(needle)) {
      result.bookingConfirmedCustomerBody = insertBeforeSignOff(
        result.bookingConfirmedCustomerBody,
        paragraph
      );
    }
  };
  ensureInBody(calendarToken, `Add it to your calendar: ${calendarToken}`);
  ensureInBody(directionsToken, `Find us: ${directionsToken}`);
  ensureInBody(token, `Change or cancel your booking: ${token}`);
  const myBookingsToken = friendlyToken("My bookings link");
  ensureInBody(myBookingsToken, `See all your bookings: ${myBookingsToken}`);
  if (!result.bookingConfirmedCustomerSms.includes(token)) {
    const sms = result.bookingConfirmedCustomerSms.trimEnd();
    result.bookingConfirmedCustomerSms = `${sms} Cancel here: ${token}`;
  }
  result.bookingConfirmedCustomerSms = result.bookingConfirmedCustomerSms.replace(
    `Need to cancel? ${token}`,
    `Cancel here: ${token}`
  );
  if (!result.bookingConfirmedCustomerSms.includes(myBookingsToken)) {
    const sms = result.bookingConfirmedCustomerSms.trimEnd();
    result.bookingConfirmedCustomerSms = `${sms} Your bookings: ${myBookingsToken}`;
  }
  return result;
}

export function resolveNotificationMessages(stored: unknown): NotificationMessages {
  const defaults = { ...DEFAULT_NOTIFICATION_MESSAGES };
  if (!stored || typeof stored !== "object") {
    return ensureCancelLink(normalizeAllNotificationMessages(defaults));
  }
  const partial = stored as Partial<NotificationMessages>;
  const merged = { ...defaults, ...partial };
  return ensureCancelLink(normalizeAllNotificationMessages(merged));
}

export function buildBookLink(
  technicianId: string,
  serviceId: string,
  date: string,
  startTime: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  return `${baseUrl}/book/tech/${technicianId}/${serviceId}/${date}/${encodeURIComponent(startTime)}`;
}

/** Booking page with the date pre-selected (no specific time). */
export function buildBookLinkForDate(
  technicianId: string,
  serviceId: string,
  date: string,
  waitlistToken?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  let url = `${baseUrl}/book/tech/${technicianId}/${serviceId}?date=${encodeURIComponent(date)}`;
  if (waitlistToken) {
    url += `&wl=${encodeURIComponent(waitlistToken)}`;
  }
  return url;
}

/** Instagram profile URL from the handle saved in business settings. */
export function buildInstagramLink(handle?: string | null): string {
  const normalized = (handle || "bebeauty.bar").replace(/^@/, "").trim();
  return `https://instagram.com/${normalized}`;
}

export function previewMessage(template: string): string {
  return applyTemplate(template, MESSAGE_PREVIEW_SAMPLE);
}

export function previewEmailHtml(template: string): string {
  return renderEmailBody(template, MESSAGE_PREVIEW_SAMPLE);
}
