import {
  DEFAULT_NOTIFICATION_MESSAGES,
  type NotificationMessages,
} from "@/lib/notificationDefaults";
import {
  MESSAGE_TOKEN_CLOSE,
  MESSAGE_TOKEN_OPEN,
  getMessageTokenRegex,
} from "@/lib/messageEditorTokens";

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
};

export function friendlyToken(label: string): string {
  return `${MESSAGE_TOKEN_OPEN}${label}${MESSAGE_TOKEN_CLOSE}`;
}

/** Editor-only HTML: underlined labels with zero-width delimiters (no visible gaps). */
export function renderMessageEditorHighlightHtml(text: string): string {
  if (!text) return "&nbsp;";

  const parts: string[] = [];
  let lastIndex = 0;
  const re = getMessageTokenRegex();
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    const label =
      match[1] ?? match[2] ?? PLACEHOLDER_LABELS[match[3] as string] ?? match[3];
    parts.push(
      MESSAGE_TOKEN_OPEN,
      `<span class="underline decoration-navy/55 decoration-2 underline-offset-[3px]">${escapeHtml(label)}</span>`,
      MESSAGE_TOKEN_CLOSE
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join("") || "&nbsp;";
}

/** Friendly labels — shown as buttons in Settings → Messages. */
export const MESSAGE_INSERT_TAGS: { label: string; token: string; hint?: string }[] = [
  { label: "Customer name", token: friendlyToken("Customer name") },
  { label: "Service", token: friendlyToken("Service") },
  { label: "Technician", token: friendlyToken("Technician") },
  { label: "Date", token: friendlyToken("Date") },
  { label: "Time", token: friendlyToken("Time") },
  { label: "Salon name", token: friendlyToken("Salon name") },
  { label: "Booking link", token: friendlyToken("Booking link"), hint: "Link to book a slot" },
  {
    label: "Pay deposit link",
    token: friendlyToken("Pay deposit link"),
    hint: "Link to pay deposit",
  },
];

export function toFriendlyPlaceholders(template: string): string {
  let text = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const label = PLACEHOLDER_LABELS[key];
    return label ? friendlyToken(label) : `{{${key}}}`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, label: string) => friendlyToken(label.trim()));
  return text;
}

function substituteTokenLabel(label: string, vars: Record<string, string>): string {
  const key = LABEL_TO_VAR[label.trim()];
  return key ? (vars[key] ?? "") : label;
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  const tokenRe = getMessageTokenRegex();
  const withFriendly = template.replace(tokenRe, (raw, a, b, c) => {
    const label = a ?? b ?? PLACEHOLDER_LABELS[c as string] ?? c;
    return substituteTokenLabel(label, vars);
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
  let text = value || fallback;
  if (text.includes("<") && /<[a-z][\s\S]*>/i.test(text)) {
    text = htmlToPlainText(text);
  }
  return toFriendlyPlaceholders(text);
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
