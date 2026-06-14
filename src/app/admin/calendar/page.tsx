"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parse, endOfMonth, startOfDay, addDays } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Booking = {
  id: string;
  service: { name: string };
  technician?: { name: string } | null;
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const bookableRange = useMemo(() => getCustomerBookableRange(), []);

  const calendarMonths = useMemo(() => {
    return bookableRange.monthStarts.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return {
        monthStart,
        monthEnd,
        days: eachDayOfInterval({ start: weekStart, end: weekEnd }),
        title: format(monthStart, "MMMM yyyy"),
      };
    });
  }, [bookableRange.monthStarts]);

  const viewWeekStart = calendarMonths[0]?.days[0];
  const viewWeekEnd = calendarMonths[calendarMonths.length - 1]?.days.at(-1);

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
    if (!token || !viewWeekStart || !viewWeekEnd) return;
    fetchData(format(viewWeekStart, "yyyy-MM-dd"), format(viewWeekEnd, "yyyy-MM-dd"));
  }, [token, viewWeekStart, viewWeekEnd, fetchData]);

  const confirmDeposit = useCallback(
    (bookingId: string) => {
      setConfirmingId(bookingId);
      fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "confirmed" }),
      })
        .then((r) => {
          if (r.status === 401) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = "/admin";
            return;
          }
          if (viewWeekStart && viewWeekEnd) {
            fetchData(format(viewWeekStart, "yyyy-MM-dd"), format(viewWeekEnd, "yyyy-MM-dd"));
          }
        })
        .catch(() => {})
        .finally(() => setConfirmingId(null));
    },
    [fetchData, viewWeekStart, viewWeekEnd]
  );

  useEffect(() => {
    if (!selectedDate) return;
    const timer = window.setTimeout(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedDate]);

  if (!token || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-charcoal/60">Loading calendar...</p>
      </div>
    );
  }

  const weekStart = viewWeekStart!;
  const weekEnd = viewWeekEnd!;

  const isCustomerBookableDate = (date: Date) => {
    const d = startOfDay(date);
    return d >= startOfDay(bookableRange.minBookableDate) && d <= startOfDay(bookableRange.rangeEnd);
  };

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

  const getBlocksForDate = (dateStr: string): TimeOffBlock[] => {
    return timeOffBlocks.filter((block) => {
      const sel = parse(dateStr, "yyyy-MM-dd", new Date());
      const start = parse(block.startDate, "yyyy-MM-dd", new Date());
      const end = parse(block.endDate, "yyyy-MM-dd", new Date());
      return sel >= start && sel <= end;
    });
  };

  // Use today's calendar date (yyyy-MM-dd) so the highlighted square always matches the actual current day
  const todayDateStr = format(startOfDay(new Date()), "yyyy-MM-dd");
  const isToday = (date: Date) => format(startOfDay(date), "yyyy-MM-dd") === todayDateStr;
  const isPast = (date: Date) => date < startOfDay(new Date()) && !isToday(date);

  const calendarTitle = calendarMonths.map((m) => m.title).join(" · ");

  const selectedBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];
  const selectedBlocks = selectedDate ? getBlocksForDate(selectedDate) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
      <div className="flex items-center justify-between mb-4 sm:mb-8 flex-wrap gap-3 sm:gap-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Calendar</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (viewWeekStart && viewWeekEnd) {
                fetchData(format(viewWeekStart, "yyyy-MM-dd"), format(viewWeekEnd, "yyyy-MM-dd"));
              }
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

      <p className="text-base sm:text-xl font-semibold text-charcoal mb-4 sm:mb-6 text-center sm:text-left">
        {calendarTitle}
      </p>
      <p className="text-xs text-charcoal/60 mb-4 sm:mb-6 -mt-2 sm:-mt-4">
        Same dates customers can book online (from tomorrow through{" "}
        {format(bookableRange.rangeEnd, "d MMMM yyyy")}).
      </p>

      {/* Calendar + Overview side by side */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar Grids - two months side by side */}
        <div className="flex-1 min-w-0 w-full flex flex-col sm:flex-row gap-6 overflow-x-auto">
          {calendarMonths.map(({ days, monthStart, monthEnd, title }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex-1 min-w-[280px]">
              <h3 className="text-sm font-semibold text-charcoal mb-3">{title}</h3>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-charcoal/60 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {days.map((day) => {
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
                        ${isCurrentMonth && !isPast(day) && isCustomerBookableDate(day) ? "hover:border-navy/50 hover:bg-slate-50" : ""}
                        ${isCurrentMonth && !isPast(day) && !isCustomerBookableDate(day) ? "opacity-70" : ""}
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
          ))}
        </div>

        {/* Overview - right */}
        <div ref={detailPanelRef} className="w-full lg:w-80 lg:shrink-0 lg:top-4 scroll-mt-6">
          {selectedDate && (selectedBookings.length > 0 || selectedBlocks.length > 0) && (
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
              {selectedBlocks.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-violet-700 mb-2">Time off</p>
                  <div className="space-y-2">
                    {selectedBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="p-3 rounded-lg border border-violet-200 bg-violet-50/80 text-sm text-charcoal"
                      >
                        {block.startDate === block.endDate ? (
                          <p>{block.startTime} – {block.endTime}</p>
                        ) : (
                          <p>{block.startDate} {block.startTime} – {block.endDate} {block.endTime}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedBookings.length > 0 && (
              <div className="space-y-3">
                {selectedBlocks.length > 0 && <p className="text-sm font-medium text-charcoal mt-2">Bookings</p>}
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
                          {booking.technician?.name && <> · {booking.technician.name}</>}
                        </p>
                        <p className="text-xs text-charcoal/60 mt-1">
                          {booking.customerPhone ? (
                            <CopyPhoneButton phone={booking.customerPhone} />
                          ) : (
                            booking.customerEmail || "No contact"
                          )}
                          {" · "}
                          {formatCurrency(booking.depositAmount)} deposit
                        </p>
                        {booking.notes && booking.notes.trim() && (
                          <p className="text-sm text-navy mt-2 italic border-l-2 border-navy/30 pl-2">
                            📝 Special request: {booking.notes}
                          </p>
                        )}
                        {booking.status === "pending_deposit" && (
                          <button
                            type="button"
                            onClick={() => confirmDeposit(booking.id)}
                            disabled={confirmingId === booking.id}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition"
                          >
                            {confirmingId === booking.id ? "Confirming…" : "Mark deposit paid"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              )}
            </div>
          )}

          {selectedDate && selectedBookings.length === 0 && selectedBlocks.length === 0 && (
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
