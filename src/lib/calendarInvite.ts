/** "Add to calendar" helpers — pure, safe for client components. */
import { appointmentStartUtc } from "@/lib/business-time";

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
};

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventTimes(event: CalendarEvent): { start: string; end: string } {
  return {
    start: utcStamp(appointmentStartUtc(event.date, event.startTime)),
    end: utcStamp(appointmentStartUtc(event.date, event.endTime)),
  };
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** iCalendar file content (Apple Calendar, Outlook, most phone calendars). */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const { start, end } = eventTimes(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Be Beauty Bar//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/**
 * Google Maps link for the salon (name + address so the pin shows the business).
 * Single query parameter on purpose: email linkify stops at "&".
 */
export function googleMapsUrl(businessName: string, address?: string | null): string {
  const query = address?.trim() ? `${businessName}, ${address.trim()}` : businessName;
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export function bookingCalendarEvent(
  booking: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    service: { name: string };
    technician?: { name: string } | null;
  },
  businessName: string,
  bookingPageUrl: string,
  address?: string | null
): CalendarEvent {
  const withTech = booking.technician?.name ? ` with ${booking.technician.name}` : "";
  const location = address?.trim() ? `${businessName}, ${address.trim()}` : businessName;
  return {
    uid: `booking-${booking.id}@bbbar.co.uk`,
    title: `${booking.service.name} – ${businessName}`,
    description: [
      `${booking.service.name}${withTech} at ${businessName}.`,
      `Directions: ${googleMapsUrl(businessName, address)}`,
      `Booking details: ${bookingPageUrl}`,
    ].join("\n"),
    location,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
  };
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = eventTimes(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
