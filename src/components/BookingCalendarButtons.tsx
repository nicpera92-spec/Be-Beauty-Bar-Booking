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
  "flex flex-col items-center justify-center gap-1.5 text-center rounded-[14px] border border-white/15 bg-[#121722] px-2 py-4 text-[13px] leading-snug text-white hover:border-[rgba(120,160,230,0.6)] transition min-h-[84px]";
const iconClass = "text-[18px] text-[#c9d0da]";

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
      <div className="grid grid-cols-3 gap-2.5">
        <a href={`/api/bookings/${booking.id}/calendar`} className={buttonClass}>
          <span className={iconClass} aria-hidden>◷</span>
          Apple / Outlook calendar
        </a>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <span className={iconClass} aria-hidden>◷</span>
          Google Calendar
        </a>
        <a
          href={googleMapsUrl(businessName, businessAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          <span className={iconClass} aria-hidden>⌖</span>
          Directions
        </a>
      </div>
      {businessAddress && <p className="lux-muted text-sm mt-3 text-center">{businessAddress}</p>}
    </div>
  );
}
