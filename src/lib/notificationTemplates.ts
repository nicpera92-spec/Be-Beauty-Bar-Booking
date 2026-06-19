import {
  DEFAULT_NOTIFICATION_MESSAGES,
  type NotificationMessages,
} from "@/lib/notificationDefaults";

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** Friendly labels — shown as buttons in Settings → Messages. */
export const MESSAGE_INSERT_TAGS: { label: string; token: string; hint?: string }[] = [
  { label: "Customer name", token: "{{customerName}}" },
  { label: "Service", token: "{{serviceName}}" },
  { label: "Technician", token: "{{technicianName}}" },
  { label: "Date", token: "{{date}}" },
  { label: "Time", token: "{{time}}" },
  { label: "Salon name", token: "{{businessName}}" },
  { label: "Booking link", token: "{{bookLink}}", hint: "Link to book a slot" },
  { label: "Pay deposit link", token: "{{depositLink}}", hint: "Link to pay deposit" },
];

export const MESSAGE_PREVIEW_SAMPLE: Record<string, string> = {
  customerName: "Alex",
  serviceName: "Gel Manicure",
  technicianName: "Sarah",
  date: "Saturday, 20 June 2026",
  time: "14:00 – 15:00",
  businessName: "Be Beauty Bar",
  bookLink: "https://bbbar.co.uk/book",
  bookingLink: "https://bbbar.co.uk/book",
  depositLink: "https://bbbar.co.uk/booking/example",
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
    /([^:\n<]+?):\s*(https?:\/\/[^\s<&]+)/g,
    '<a href="$2">$1</a>'
  );
  return withLabels.replace(/(?<!href=")(https?:\/\/[^\s<&]+)/g, '<a href="$1">$1</a>');
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
  if (!value) return fallback;
  if (value.includes("<") && /<[a-z][\s\S]*>/i.test(value)) {
    return htmlToPlainText(value);
  }
  return value;
}

export function resolveNotificationMessages(stored: unknown): NotificationMessages {
  const defaults = { ...DEFAULT_NOTIFICATION_MESSAGES };
  if (!stored || typeof stored !== "object") {
    return defaults;
  }
  const partial = stored as Partial<NotificationMessages>;
  const merged = { ...defaults, ...partial };
  const keys = Object.keys(defaults) as (keyof NotificationMessages)[];
  for (const key of keys) {
    merged[key] = normalizeStoredMessage(merged[key], defaults[key]);
  }
  return merged;
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

export function previewMessage(template: string): string {
  return applyTemplate(template, MESSAGE_PREVIEW_SAMPLE);
}

export function previewEmailHtml(template: string): string {
  return renderEmailBody(template, MESSAGE_PREVIEW_SAMPLE);
}
