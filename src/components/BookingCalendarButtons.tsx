"use client";

import { bookingCalendarEvent, googleCalendarUrl, googleMapsUrl } from "@/lib/calendarInvite";

type CalendarBooking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  service: { name: string };
  technician?: { name: string } | null;
};

const buttonClass =
  "inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-navy hover:bg-slate-50 transition min-h-[44px]";

/** "Add to calendar" + "Get directions" buttons for a confirmed booking. */
export default function BookingCalendarButtons({
  booking,
  businessName,
  businessAddress,
  className = "",
}: {
  booking: CalendarBooking;
  businessName: string;
  businessAddress?: string | null;
  className?: string;
}) {
  const bookingPageUrl =
    typeof window !== "undefined" ? `${window.location.origin}/booking/${booking.id}` : "";
  const event = bookingCalendarEvent(booking, businessName, bookingPageUrl, businessAddress);

  return (
    <div className={className} id="calendar">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/bookings/${booking.id}/calendar`} className={buttonClass}>
          Add to Apple / Outlook calendar
        </a>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          Add to Google Calendar
        </a>
        <a
          href={googleMapsUrl(businessName, businessAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Get directions
        </a>
      </div>
      {businessAddress && <p className="text-slate-500 text-sm mt-3">{businessAddress}</p>}
    </div>
  );
}
