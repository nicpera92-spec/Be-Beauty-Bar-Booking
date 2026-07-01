"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { eachDayOfInterval, format, isBefore, isAfter, parse, getDay } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";
import WaitlistJoinForm from "@/components/WaitlistJoinForm";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  depositAmount: number;
  technicianId: string;
};

type Slot = { start: string; end: string };
type Settings = { instagramHandle?: string | null; waitlistEnabled?: boolean };

function formatTime24to12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (h === 12) return `12:${m.toString().padStart(2, "0")} PM`;
  if (h === 0) return `12:${m.toString().padStart(2, "0")} AM`;
  return h > 12 ? `${h - 12}:${m.toString().padStart(2, "0")} PM` : `${h}:${m.toString().padStart(2, "0")} AM`;
}

export default function BookDatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const technicianId = params.technicianId as string;
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<Service | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const timeSectionRef = useRef<HTMLDivElement>(null);

  const { minBookableDate, rangeEnd: calendarEnd, fromStr, toStr } = getCustomerBookableRange();
  const dates = eachDayOfInterval({ start: minBookableDate, end: calendarEnd });

  const monthsWithDates = (() => {
    const map = new Map<string, Date[]>();
    for (const d of dates) {
      const key = format(d, "MMMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries());
  })();

  useEffect(() => {
    Promise.all([
      fetch(`/api/services?technicianId=${encodeURIComponent(technicianId)}&_=${Date.now()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/slots/availability?serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}&from=${fromStr}&to=${toStr}`
      ).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([servicesData, availData, settingsData]) => {
        const list = Array.isArray(servicesData) ? servicesData : [];
        const s = list.find((x: { id: string }) => x.id === serviceId);
        setService(s ?? null);
        setAvailability(availData?.availability ?? {});
        setSettings(settingsData?.error ? null : settingsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [serviceId, technicianId, fromStr, toStr]);

  useEffect(() => {
    const param = searchParams.get("date");
    if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return;
    try {
      const day = parse(param, "yyyy-MM-dd", new Date());
      if (isBefore(day, minBookableDate) || isAfter(day, calendarEnd)) return;
      setSelectedDate(param);
    } catch {
      /* ignore invalid date */
    }
  }, [searchParams, minBookableDate, calendarEnd]);

  const fetchSlots = useCallback(() => {
    if (!selectedDate || !serviceId || !technicianId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    fetch(
      `/api/slots?date=${selectedDate}&serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}`
    )
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, serviceId, technicianId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (selectedDate && timeSectionRef.current) {
      timeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && slots.length > 0 && timeSectionRef.current) {
      timeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate, slots.length]);

  const selectedDateLabel = selectedDate
    ? (() => {
        try {
          const d = parse(selectedDate, "yyyy-MM-dd", new Date());
          return format(d, "EEEE, d MMMM yyyy");
        } catch {
          return selectedDate;
        }
      })()
    : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!service) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-600 mb-6">Service not found.</p>
        <Link href={`/book/tech/${technicianId}`} className="text-navy hover:underline">
          ← Back to services
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-8">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        <Link href={`/book/tech/${technicianId}`} className="text-sm text-navy hover:underline">
          ← Back to services
        </Link>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
        {service.name}
      </h1>
      <p className="text-slate-600 text-sm mb-10">
        {service.durationMin} min · {formatCurrency(service.depositAmount)} deposit
      </p>

      <div className="grid md:grid-cols-[1fr,1fr] gap-10 md:gap-12 items-start">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-4">
            1. Choose a date
          </h2>
          <p className="text-slate-600 text-sm mb-6">Tap a date to see available times.</p>
          {monthsWithDates.map(([monthTitle, monthDates]) => {
            // Align the first bookable day to its weekday column (Monday first).
            const leadingBlanks = (getDay(monthDates[0]) + 6) % 7;
            return (
            <div key={monthTitle} className="mb-8 last:mb-0">
              <h3 className="text-sm font-semibold text-navy mb-3">{monthTitle}</h3>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                  <div
                    key={w}
                    className="text-center text-[10px] sm:text-xs font-medium text-slate-400"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-0">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} aria-hidden className="min-h-[36px] sm:min-h-[40px]" />
                ))}
                {monthDates.map((d) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const isPast = isBefore(d, minBookableDate);
                  const hasSlots = availability[dateStr] ?? true;
                  const isFullyBooked = !isPast && !hasSlots;
                  const isSelected = selectedDate === dateStr;
                  let dayClass =
                    "py-1.5 sm:py-2 rounded-md text-xs font-medium transition touch-manipulation min-h-[36px] sm:min-h-[40px] border ";
                  if (isPast) {
                    dayClass += "bg-slate-100 text-slate-300 border-transparent cursor-not-allowed";
                  } else if (isFullyBooked) {
                    dayClass +=
                      "bg-slate-100/90 text-slate-400 font-normal border-slate-100 hover:bg-slate-100 hover:border-slate-200/70";
                  } else {
                    dayClass +=
                      "border-slate-200 bg-white text-slate-800 hover:border-navy/40 hover:bg-slate-50";
                  }
                  if (isSelected) {
                    dayClass += " ring-2 ring-navy ring-offset-1 bg-navy/5 border-navy/30";
                  }
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        if (!isPast) setSelectedDate(dateStr);
                      }}
                      className={dayClass}
                    >
                      {format(d, "d")}
                      <br />
                      <span
                        className={`text-[10px] sm:text-xs font-normal ${
                          isPast
                            ? "text-slate-300"
                            : isFullyBooked
                              ? "text-slate-400/60"
                              : "text-slate-500"
                        }`}
                      >
                        {format(d, "EEE")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}
          <p className="mt-6 text-sm text-slate-600">
            <span className="font-bold text-red-600">Emergency</span> after-hours appointments
            available upon request. Enquire via{" "}
            <a
              href={`https://instagram.com/${(settings?.instagramHandle || "bebeauty.bar").replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy hover:underline"
            >
              @bebeauty.bar
            </a>
            . (Double rates apply).
          </p>
        </div>

        <div
          ref={timeSectionRef}
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 min-h-[200px]"
        >
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-navy mb-4">
            2. Choose a time
          </h2>
          {!selectedDate ? (
            <p className="text-slate-500 text-sm">Select a date to see available times.</p>
          ) : slotsLoading ? (
            <p className="text-slate-500 text-sm">Loading times…</p>
          ) : slots.length === 0 ? (
            selectedDate && selectedDateLabel ? (
              settings?.waitlistEnabled !== false ? (
                <WaitlistJoinForm
                  serviceId={serviceId}
                  technicianId={technicianId}
                  preferredDate={selectedDate}
                  dateLabel={selectedDateLabel}
                  canNotifyEarlier={isAfter(
                    parse(selectedDate, "yyyy-MM-dd", new Date()),
                    minBookableDate
                  )}
                />
              ) : (
                <p className="text-slate-500 text-sm">
                  No times available for {selectedDateLabel}.
                </p>
              )
            ) : (
              <p className="text-slate-500 text-sm">No times available.</p>
            )
          ) : (
            <>
              <p className="text-slate-600 text-sm mb-4">{selectedDateLabel}</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
                {slots.map((slot) => (
                  <Link
                    key={slot.start}
                    href={`/book/tech/${technicianId}/${serviceId}/${selectedDate}/${encodeURIComponent(slot.start)}`}
                    className="flex items-center justify-center px-2 py-2 sm:py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-[11px] sm:text-xs font-medium hover:border-navy/40 hover:bg-navy/5 hover:text-navy transition touch-manipulation text-center min-h-[40px] sm:min-h-[44px] min-w-0"
                  >
                    {formatTime24to12(slot.start)} – {formatTime24to12(slot.end)}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
