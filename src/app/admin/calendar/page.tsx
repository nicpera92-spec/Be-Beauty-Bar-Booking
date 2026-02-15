"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parse, addMonths, subMonths, startOfMonth, endOfMonth, startOfDay, addDays } from "date-fns";
import { formatCurrency } from "@/lib/format";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Booking = {
  id: string;
  service: { name: string };
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  depositAmount: number;
  status: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  notes: string | null;
};

type TimeOffBlock = {
  id: string;
  startDate: string; // yyyy-MM-dd
  startTime: string;
  endDate: string;
  endTime: string;
};

export default function AdminCalendarPage() {
  const [token, setToken] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeOffBlocks, setTimeOffBlocks] = useState<TimeOffBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date())); // Current month
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (t) {
      setToken(t);
    } else {
      window.location.href = "/admin";
    }
  }, []);

  const fetchData = useCallback((from: string, to: string) => {
    if (!token) return;
    setLoading(true);
    const headers = getAuthHeaders();
    Promise.all([
      fetch("/api/bookings", { headers }).then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          window.location.href = "/admin";
          return [];
        }
        return r.json();
      }),
      fetch(`/api/admin/blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }).then((r) => {
        if (r.status === 401) return [];
        return r.json();
      }),
    ])
      .then(([bookingsData, blocksData]) => {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setTimeOffBlocks(Array.isArray(blocksData) ? blocksData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    fetchData(format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd"));
  }, [token, monthDate, fetchData]);

  if (!token || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-charcoal/60">Loading calendar...</p>
      </div>
    );
  }

  // One month: grid from first Monday on or before 1st to last Sunday on or after last day of month
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInView = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter bookings for the visible month range
  const activeBookings = bookings.filter((b) => {
    if (b.status === "cancelled") return false;
    const bookingDate = parse(b.date, "yyyy-MM-dd", new Date());
    return bookingDate >= weekStart && bookingDate <= weekEnd;
  });

  // Group bookings by date
  const bookingsByDate: Record<string, Booking[]> = {};
  activeBookings.forEach((booking) => {
    if (!bookingsByDate[booking.date]) {
      bookingsByDate[booking.date] = [];
    }
    bookingsByDate[booking.date].push(booking);
  });

  const getBookingsForDate = (date: Date): Booking[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookingsByDate[dateStr] || [];
  };

  // Build set of dates that have time off (any block overlapping that day)
  const timeOffByDate: Record<string, boolean> = {};
  timeOffBlocks.forEach((block) => {
    let d = parse(block.startDate, "yyyy-MM-dd", new Date());
    const end = parse(block.endDate, "yyyy-MM-dd", new Date());
    while (d <= end) {
      timeOffByDate[format(d, "yyyy-MM-dd")] = true;
      d = addDays(d, 1);
    }
  });

  const hasTimeOff = (date: Date) => timeOffByDate[format(date, "yyyy-MM-dd")] === true;

  // Use today's calendar date (yyyy-MM-dd) so the highlighted square always matches the actual current day
  const todayDateStr = format(startOfDay(new Date()), "yyyy-MM-dd");
  const isToday = (date: Date) => format(startOfDay(date), "yyyy-MM-dd") === todayDateStr;
  const isPast = (date: Date) => date < startOfDay(new Date()) && !isToday(date);

  const goToPreviousMonth = () => setMonthDate(subMonths(monthDate, 1));
  const goToNextMonth = () => setMonthDate(addMonths(monthDate, 1));
  const goToThisMonth = () => setMonthDate(startOfMonth(new Date()));

  const selectedBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
      <div className="flex items-center justify-between mb-4 sm:mb-8 flex-wrap gap-3 sm:gap-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
            const ws = startOfWeek(monthStart, { weekStartsOn: 1 });
            const we = endOfWeek(monthEnd, { weekStartsOn: 1 });
            fetchData(format(ws, "yyyy-MM-dd"), format(we, "yyyy-MM-dd"));
          }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-sm font-medium transition"
            title="Refresh calendar"
          >
            ↻ Refresh
          </button>
          <Link
            href="/admin"
            className="text-sm text-sky-600 hover:underline"
          >
            ← Back to admin
          </Link>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(ADMIN_TOKEN_KEY);
              window.location.href = "/admin";
            }}
            className="text-sm text-charcoal/60 hover:text-charcoal"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2 sm:gap-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-xs sm:text-sm font-medium transition touch-manipulation min-h-[44px]"
        >
          ← Previous month
        </button>
        <div className="flex items-center gap-4">
          <h2 className="text-base sm:text-xl font-semibold text-charcoal text-center">
            {format(monthDate, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={goToThisMonth}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-xs font-medium transition touch-manipulation min-h-[44px]"
          >
            This month
          </button>
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-xs sm:text-sm font-medium transition touch-manipulation min-h-[44px]"
        >
          Next month →
        </button>
      </div>

      {/* Calendar + Overview side by side */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar Grid - left */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex-1 min-w-0 w-full overflow-x-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 min-w-[280px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-charcoal/60 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[280px]">
            {/* One month grid (includes leading/trailing days from adjacent months) */}
            {daysInView.map((day) => {
              const dayBookings = getBookingsForDate(day);
              const dateStr = format(day, "yyyy-MM-dd");
              const isSelected = selectedDate === dateStr;
              const isCurrentMonth = day >= monthStart && day <= monthEnd;
              const dayHasTimeOff = hasTimeOff(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`
                    aspect-square p-1.5 sm:p-2 rounded-lg border-2 transition-all touch-manipulation min-h-[44px]
                    ${isToday(day) ? "border-navy bg-navy/5" : "border-slate-200"}
                    ${isPast(day) ? "bg-slate-300 text-slate-500 hover:bg-slate-300" : ""}
                    ${!isPast(day) && !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : ""}
                    ${dayHasTimeOff && !isPast(day) ? "bg-violet-50/80 border-violet-200/60" : ""}
                    ${isSelected ? "ring-2 ring-navy ring-offset-2" : ""}
                    ${isCurrentMonth && !isPast(day) ? "hover:border-navy/50 hover:bg-slate-50" : ""}
                  `}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-navy" : isPast(day) ? "text-slate-500" : !isCurrentMonth ? "text-slate-400" : "text-charcoal"}`}>
                      {format(day, "d")}
                    </div>
                    {dayHasTimeOff && (
                      <div className="text-[10px] sm:text-xs text-violet-600 font-medium truncate" title="Time off">
                        Time off
                      </div>
                    )}
                    {dayBookings.length > 0 && (
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={`
                              text-xs px-1.5 py-0.5 rounded truncate
                              ${booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                            `}
                            title={`${booking.customerName} - ${booking.service.name} ${booking.startTime}`}
                          >
                            {booking.startTime} {booking.customerName.split(" ")[0]}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-xs text-charcoal/60 font-medium">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview - right */}
        <div className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-4">
          {selectedDate && selectedBookings.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-charcoal">
                  {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "EEEE, d MMMM yyyy")}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-charcoal/60 hover:text-charcoal"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {selectedBookings
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-charcoal">{booking.customerName}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {booking.status === "confirmed" ? "Confirmed" : "Pending deposit"}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal/80">
                          {booking.service.name} · {booking.startTime}–{booking.endTime}
                        </p>
                        <p className="text-xs text-charcoal/60 mt-1">
                          {booking.customerEmail || booking.customerPhone || "No contact"} · {formatCurrency(booking.depositAmount)} deposit
                        </p>
                        {booking.notes && booking.notes.trim() && (
                          <p className="text-sm text-navy mt-2 italic border-l-2 border-navy/30 pl-2">
                            📝 Special request: {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedDate && selectedBookings.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-charcoal/60">
                No bookings on {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "d MMMM yyyy")}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="mt-3 text-sm text-charcoal/60 hover:text-charcoal"
              >
                Close
              </button>
            </div>
          )}

          {!selectedDate && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-charcoal/60">
                Click a date to see bookings
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
