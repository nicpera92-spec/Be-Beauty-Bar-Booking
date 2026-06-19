import {
  DEFAULT_NOTIFICATION_MESSAGES,
  type NotificationMessages,
} from "@/lib/notificationDefaults";

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function resolveNotificationMessages(
  stored: unknown
): NotificationMessages {
  if (!stored || typeof stored !== "object") {
    return { ...DEFAULT_NOTIFICATION_MESSAGES };
  }
  return { ...DEFAULT_NOTIFICATION_MESSAGES, ...(stored as Partial<NotificationMessages>) };
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
