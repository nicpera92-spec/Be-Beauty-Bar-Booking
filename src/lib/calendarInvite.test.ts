/**
 * Tests for "Add to calendar" files and links.
 * Run: npm run test:calendar
 */
import { bookingCalendarEvent, buildIcs, googleCalendarUrl, googleMapsUrl } from "@/lib/calendarInvite";
import { friendlyToken, renderEmailBody, resolveNotificationMessages } from "@/lib/notificationTemplates";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const summer = bookingCalendarEvent(
  {
    id: "bk1",
    date: "2026-07-10",
    startTime: "14:00",
    endTime: "15:30",
    service: { name: "Gel Manicure, Classic" },
    technician: { name: "Svitlana" },
  },
  "Be Beauty Bar",
  "https://bbbar.co.uk/booking/bk1",
  "33 Castle St, Swansea SA1 1HZ"
);

const ics = buildIcs(summer, new Date("2026-07-01T09:00:00Z"));
assert(
  ics.includes("LOCATION:Be Beauty Bar\\, 33 Castle St\\, Swansea SA1 1HZ"),
  "calendar location includes the salon address"
);
assert(ics.includes("Directions: https://maps.google.com/?q="), "calendar notes include a maps link");
assert(ics.includes("DTSTART:20260710T130000Z"), "BST start converted to UTC");
assert(ics.includes("DTEND:20260710T143000Z"), "BST end converted to UTC");
assert(ics.includes("SUMMARY:Gel Manicure\\, Classic – Be Beauty Bar"), "commas escaped in title");
assert(ics.includes("UID:booking-bk1@bbbar.co.uk"), "stable UID per booking");
assert(ics.includes("\r\n") && ics.endsWith("END:VCALENDAR\r\n"), "uses CRLF line endings");
assert(ics.includes("BEGIN:VALARM"), "includes a reminder");

const winter = bookingCalendarEvent(
  { id: "bk2", date: "2026-12-10", startTime: "9:30", endTime: "10:30", service: { name: "Lashes" } },
  "Be Beauty Bar",
  "https://bbbar.co.uk/booking/bk2"
);
assert(buildIcs(winter).includes("DTSTART:20261210T093000Z"), "GMT start unchanged");

const google = new URL(googleCalendarUrl(summer));
assert(google.hostname === "calendar.google.com", "google calendar host");
assert(google.searchParams.get("dates") === "20260710T130000Z/20260710T143000Z", "google dates");
assert(google.searchParams.get("text") === "Gel Manicure, Classic – Be Beauty Bar", "google title");

const calendarToken = friendlyToken("Calendar link");
const defaults = resolveNotificationMessages(null);
assert(defaults.bookingConfirmedCustomerBody.includes(calendarToken), "default email has calendar link");
const saved = resolveNotificationMessages({ bookingConfirmedCustomerBody: "Hi **Customer name**!" });
assert(saved.bookingConfirmedCustomerBody.includes(calendarToken), "saved email gets calendar link");
const html = renderEmailBody(defaults.bookingConfirmedCustomerBody, {
  calendarLink: "https://bbbar.co.uk/booking/bk1#calendar",
});
assert(
  html.includes('<a href="https://bbbar.co.uk/booking/bk1#calendar">Add it to your calendar</a>'),
  "email renders a clean calendar link"
);

// --- keeping calendar entries in sync ---
assert(ics.includes("SEQUENCE:0") && ics.includes("STATUS:CONFIRMED"), "new booking is version 0");
const moved = buildIcs(
  bookingCalendarEvent(
    { id: "bk1", date: "2026-07-11", startTime: "10:00", endTime: "11:30", service: { name: "Gel Manicure, Classic" }, rescheduleCount: 1 },
    "Be Beauty Bar",
    "https://bbbar.co.uk/booking/bk1"
  )
);
assert(moved.includes("UID:booking-bk1@bbbar.co.uk"), "moved booking keeps the same event ID");
assert(moved.includes("SEQUENCE:1") && moved.includes("DTSTART:20260711T090000Z"), "moved version is newer with new time");
const cancelledIcs = buildIcs(
  bookingCalendarEvent(
    { id: "bk1", date: "2026-07-11", startTime: "10:00", endTime: "11:30", service: { name: "Nails" }, rescheduleCount: 1, status: "cancelled" },
    "Be Beauty Bar",
    "https://bbbar.co.uk/booking/bk1"
  )
);
assert(cancelledIcs.includes("METHOD:CANCEL") && cancelledIcs.includes("STATUS:CANCELLED"), "cancel file");
assert(cancelledIcs.includes("SEQUENCE:2"), "cancellation outranks the moved version");
assert(!cancelledIcs.includes("BEGIN:VALARM"), "no reminder on a cancelled event");

const maps = googleMapsUrl("Be Beauty Bar", "33 Castle St, Swansea SA1 1HZ");
assert(
  maps === "https://maps.google.com/?q=Be%20Beauty%20Bar%2C%2033%20Castle%20St%2C%20Swansea%20SA1%201HZ",
  "maps link searches name and address"
);
assert(!maps.includes("&"), "maps link has no & so email linkify keeps it whole");
assert(googleMapsUrl("Be Beauty Bar", "") === "https://maps.google.com/?q=Be%20Beauty%20Bar", "falls back to name");
assert(defaults.bookingConfirmedCustomerBody.includes(friendlyToken("Directions link")), "email has directions");
const directionsHtml = renderEmailBody(defaults.bookingConfirmedCustomerBody, { directionsLink: maps });
assert(directionsHtml.includes(`<a href="${maps}">Find us</a>`), "email renders a clean Find us link");

console.log("calendarInvite: all checks passed");
