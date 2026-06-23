"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parse, endOfMonth, startOfDay, addDays } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import CalendarTimeOffAdd from "@/components/CalendarTimeOffAdd";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Booking = {
  id: string;
  technicianId: string;
  service: { name: string };
  technician?: { id: string; name: string } | null;
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
  technicianId?: string | null;
  technician?: { id: string; name: string } | null;
  startDate: string; // yyyy-MM-dd
  startTime: string;
  endDate: string;
  endTime: string;
};

type Technician = {
  id: string;
  name: string;
  active: boolean;
};

export default function AdminCalendarPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [myTechnicianId, setMyTechnicianId] = useState<string | null>(null);
  const [salonOpen, setSalonOpen] = useState("09:00");
  const [salonClose, setSalonClose] = useState("17:00");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeOffBlocks, setTimeOffBlocks] = useState<TimeOffBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
      fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.role === "master") {
            setIsMaster(true);
            fetch("/api/admin/technicians", { headers: getAuthHeaders() })
              .then((r) => (r.ok ? r.json() : []))
              .then((list) => setTechnicians(Array.isArray(list) ? list : []))
              .catch(() => setTechnicians([]));
          }
          if (data?.technicianId) setMyTechnicianId(data.technicianId);
        })
        .catch(() => {});
    } else {
      window.location.href = "/admin";
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/settings", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.openTime) setSalonOpen(data.openTime);
        if (data.closeTime) setSalonClose(data.closeTime);
      })
      .catch(() => {});
  }, [token]);

  const fetchData = useCallback((from: string, to: string, techFilter: string) => {
    if (!token) return;
    setLoading(true);
    const headers = getAuthHeaders();
    const blocksUrl =
      techFilter && techFilter !== "all"
        ? `/api/admin/blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&technicianId=${encodeURIComponent(techFilter)}`
        : `/api/admin/blocks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&technicianId=all`;
    Promise.all([
      fetch("/api/bookings", { headers }).then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          window.location.href = "/admin";
          return [];
        }
        return r.json();
      }),
      fetch(blocksUrl, { headers }).then((r) => {
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
    const techFilter = isMaster ? technicianFilter : "all";
    fetchData(format(viewWeekStart, "yyyy-MM-dd"), format(viewWeekEnd, "yyyy-MM-dd"), techFilter);
  }, [token, viewWeekStart, viewWeekEnd, technicianFilter, isMaster, fetchData]);

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
            fetchData(
              format(viewWeekStart, "yyyy-MM-dd"),
              format(viewWeekEnd, "yyyy-MM-dd"),
              isMaster ? technicianFilter : "all"
            );
          }
        })
        .catch(() => {})
        .finally(() => setConfirmingId(null));
    },
    [fetchData, viewWeekStart, viewWeekEnd, isMaster, technicianFilter]
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      if (!confirm("Cancel this booking?")) return;
      setCancellingId(bookingId);
      fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "cancelled" }),
      })
        .then((r) => {
          if (r.status === 401) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = "/admin";
            return;
          }
          if (viewWeekStart && viewWeekEnd) {
            fetchData(
              format(viewWeekStart, "yyyy-MM-dd"),
              format(viewWeekEnd, "yyyy-MM-dd"),
              isMaster ? technicianFilter : "all"
            );
          }
        })
        .catch(() => {})
        .finally(() => setCancellingId(null));
    },
    [fetchData, viewWeekStart, viewWeekEnd, isMaster, technicianFilter]
  );

  const refreshCalendar = useCallback(() => {
    if (!viewWeekStart || !viewWeekEnd) return;
    fetchData(
      format(viewWeekStart, "yyyy-MM-dd"),
      format(viewWeekEnd, "yyyy-MM-dd"),
      isMaster ? technicianFilter : "all"
    );
  }, [fetchData, viewWeekStart, viewWeekEnd, isMaster, technicianFilter]);

  const removeTimeOff = useCallback(
    (blockId: string) => {
      if (!confirm("Remove this time off?")) return;
      fetch(`/api/admin/blocks/${blockId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
        .then((r) => {
          if (r.status === 401) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            window.location.href = "/admin";
            return;
          }
          if (r.ok) refreshCalendar();
        })
        .catch(() => {});
    },
    [refreshCalendar]
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
    if (isMaster && technicianFilter !== "all" && b.technicianId !== technicianFilter) {
      return false;
    }
    const bookingDate = parse(b.date, "yyyy-MM-dd", new Date());
    return bookingDate >= weekStart && bookingDate <= weekEnd;
  });

  const showAllTechnicians = isMaster && technicianFilter === "all";

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

  const timeOffLabelForDate = (dateStr: string): string => {
    const blocks = getBlocksForDate(dateStr);
    if (blocks.length === 0) return "Time off";
    if (!showAllTechnicians) return "Time off";
    const names = [
      ...new Set(blocks.map((b) => b.technician?.name).filter(Boolean) as string[]),
    ];
    if (names.length === 0) return "Time off";
    if (names.length === 1) return `${names[0].split(" ")[0]} · off`;
    return `${names.length} off`;
  };

  // Use today's calendar date (yyyy-MM-dd) so the highlighted square always matches the actual current day
  const todayDateStr = format(startOfDay(new Date()), "yyyy-MM-dd");
  const isToday = (date: Date) => format(startOfDay(date), "yyyy-MM-dd") === todayDateStr;
  const isPast = (date: Date) => date < startOfDay(new Date()) && !isToday(date);

  const selectedBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];
  const selectedBlocks = selectedDate ? getBlocksForDate(selectedDate) : [];
  const canManageOwnTimeOff =
    Boolean(myTechnicianId) &&
    (!isMaster || technicianFilter === "all" || technicianFilter === myTechnicianId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="font-serif text-2xl font-semibold text-charcoal shrink-0">Calendar</h1>
          <Link
            href="/admin"
            title="Admin home"
            aria-label="Admin home"
            className="inline-flex items-center justify-center h-[38px] w-[38px] rounded-lg border border-slate-200 text-charcoal/70 hover:text-navy hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[18px] h-[18px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isMaster && technicians.length > 0 && (
            <select
              id="calendar-technician-filter"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              aria-label="Technician schedule"
              title="Technician schedule"
              className="h-[38px] min-w-[140px] max-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-charcoal"
            >
              <option value="all">Everyone</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                  {!tech.active ? " (hidden)" : ""}
                </option>
              ))}
            </select>
          )}
          {canManageOwnTimeOff && (
            <CalendarTimeOffAdd
              openTime={salonOpen}
              closeTime={salonClose}
              defaultDate={selectedDate}
              onSuccess={refreshCalendar}
              getAuthHeaders={getAuthHeaders}
            />
          )}
        </div>
      </div>

      {/* Calendar + Overview side by side */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar Grids - two months side by side */}
        <div className="flex-1 min-w-0 w-full flex flex-col sm:flex-row sm:flex-wrap gap-6">
          {calendarMonths.map(({ days, monthStart, monthEnd, title }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex-1 min-w-[300px]">
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
                        aspect-square overflow-hidden p-1.5 sm:p-2 rounded-lg border-2 transition-all touch-manipulation min-h-[44px]
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
                          <div
                            className="text-[10px] sm:text-xs text-violet-600 font-medium truncate"
                            title={timeOffLabelForDate(dateStr)}
                          >
                            {timeOffLabelForDate(dateStr)}
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
                                title={`${booking.customerName} - ${booking.service.name} ${booking.startTime}${booking.technician?.name ? ` (${booking.technician.name})` : ""}`}
                              >
                                {booking.startTime}{" "}
                                {showAllTechnicians && booking.technician?.name
                                  ? `${booking.technician.name.split(" ")[0]} `
                                  : ""}
                                {booking.customerName.split(" ")[0]}
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
          {selectedDate && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-charcoal">
                  {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "EEEE, d MMMM yyyy")}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-charcoal/60 hover:text-charcoal shrink-0"
                >
                  Close
                </button>
              </div>

              {selectedBlocks.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-violet-700 mb-2">Time off</p>
                  <div className="space-y-2">
                    {selectedBlocks.map((block) => {
                      const canRemove = block.technicianId === myTechnicianId;
                      const techName =
                        block.technician?.name ??
                        technicians.find((t) => t.id === block.technicianId)?.name;
                      return (
                        <div
                          key={block.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-violet-200 bg-violet-50/80 text-sm text-charcoal"
                        >
                          <div className="min-w-0">
                            {techName && (
                              <p className="font-medium text-violet-900 mb-0.5">{techName}</p>
                            )}
                            <p className="text-charcoal/80">
                              {block.startDate === block.endDate ? (
                                <>{block.startTime} – {block.endTime}</>
                              ) : (
                                <>
                                  {block.startDate} {block.startTime} – {block.endDate}{" "}
                                  {block.endTime}
                                </>
                              )}
                            </p>
                          </div>
                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => removeTimeOff(block.id)}
                              className="shrink-0 text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedBookings.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-charcoal">Bookings</p>
                  {selectedBookings
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="relative flex flex-wrap items-center justify-between gap-4 p-4 pr-10 rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <button
                          type="button"
                          onClick={() => cancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                          aria-label="Cancel booking"
                          title="Cancel booking"
                          className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                          </svg>
                        </button>
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
              ) : (
                selectedBlocks.length === 0 &&
                !canManageOwnTimeOff && (
                  <p className="text-sm text-charcoal/60 text-center py-2">No bookings on this day.</p>
                )
              )}

              {isMaster &&
                technicianFilter !== "all" &&
                technicianFilter !== myTechnicianId &&
                !canManageOwnTimeOff && (
                  <p className="text-xs text-charcoal/50">
                    To add your own time off, choose your name in the schedule dropdown.
                  </p>
                )}
            </div>
          )}

          {!selectedDate && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-charcoal/60">
                Tap a date to view bookings
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
