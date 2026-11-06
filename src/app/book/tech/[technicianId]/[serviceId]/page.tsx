"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { eachDayOfInterval, format, parse, getDay } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { getCustomerBookableRange } from "@/lib/booking-calendar-range";
import WaitlistJoinForm from "@/components/WaitlistJoinForm";
import PageTopLinks from "@/components/PageTopLinks";

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

  const { today, minBookableDate, rangeEnd: calendarEnd, fromStr, toStr } = getCustomerBookableRange();
  const minBookableDateStr = format(minBookableDate, "yyyy-MM-dd");
  const waitlistToken = searchParams.get("wl");
  const linkDateParam = searchParams.get("date");
  const [waitlistAccessResolved, setWaitlistAccessResolved] = useState(!waitlistToken);
  const [waitlistAccessDate, setWaitlistAccessDate] = useState<string | null>(null);
  const calendarStart =
    waitlistAccessDate && waitlistAccessDate < minBookableDateStr ? today : minBookableDate;
  const dates = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const availabilityFrom =
    waitlistAccessDate && waitlistAccessDate < fromStr ? waitlistAccessDate : fromStr;

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
    if (!waitlistToken) {
      setWaitlistAccessDate(null);
      setWaitlistAccessResolved(true);
      return;
    }
    if (!linkDateParam || !/^\d{4}-\d{2}-\d{2}$/.test(linkDateParam)) {
      setWaitlistAccessDate(null);
      setWaitlistAccessResolved(true);
      return;
    }
    setWaitlistAccessResolved(false);
    fetch(
      `/api/waitlist/booking-access?wl=${encodeURIComponent(waitlistToken)}&date=${encodeURIComponent(linkDateParam)}&serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}`
    )
      .then((r) => r.json())
      .then((data) => setWaitlistAccessDate(data?.ok ? data.date : null))
      .catch(() => setWaitlistAccessDate(null))
      .finally(() => setWaitlistAccessResolved(true));
  }, [waitlistToken, linkDateParam, serviceId, technicianId]);

  useEffect(() => {
    if (!waitlistAccessResolved) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/services?technicianId=${encodeURIComponent(technicianId)}&_=${Date.now()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/slots/availability?serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}&from=${availabilityFrom}&to=${toStr}${waitlistToken ? `&wl=${encodeURIComponent(waitlistToken)}` : ""}`
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
  }, [serviceId, technicianId, availabilityFrom, toStr, waitlistToken, waitlistAccessResolved]);

  useEffect(() => {
    if (!waitlistAccessResolved) return;
    const param = linkDateParam;
    if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return;
    const allowed =
      param === waitlistAccessDate ||
      (param >= minBookableDateStr && param <= format(calendarEnd, "yyyy-MM-dd"));
    if (allowed) setSelectedDate(param);
  }, [linkDateParam, minBookableDateStr, calendarEnd, waitlistAccessDate, waitlistAccessResolved]);

  const fetchSlots = useCallback(() => {
    if (!selectedDate || !serviceId || !technicianId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const wlParam = waitlistToken ? `&wl=${encodeURIComponent(waitlistToken)}` : "";
    fetch(
      `/api/slots?date=${selectedDate}&serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}${wlParam}`
    )
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, serviceId, technicianId, waitlistToken]);

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

  if (loading || (waitlistToken && !waitlistAccessResolved)) {
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
    <div className="max-w-[960px] mx-auto w-full px-6 pt-14 pb-20">
      <PageTopLinks className="mb-12">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        <Link href={`/book/tech/${technicianId}`} className="text-sm text-navy hover:underline">
          ← Back to services
        </Link>
      </PageTopLinks>
      <h1 className="font-serif text-[2.4rem] sm:text-[2.75rem] font-normal text-white leading-tight mb-2">
        {service.name}
      </h1>
      <p className="lux-muted mb-10">
        {service.durationMin} min ·{" "}
        <span className="text-[#dfe4ea]">{formatCurrency(service.depositAmount)} deposit</span>
      </p>

      {waitlistToken && waitlistAccessResolved && !waitlistAccessDate && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This waiting list link is no longer valid for same-day booking. Please choose another date,
          or contact us if you still need an appointment today.
        </p>
      )}

      {waitlistAccessDate && (
        <p className="mb-6 rounded-lg border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-slate-700">
          You&apos;re booking from your waiting list notification. Same-day booking is available for{" "}
          {selectedDateLabel ?? waitlistAccessDate}.
        </p>
      )}

      <div className="grid md:grid-cols-[1fr,1fr] gap-10 md:gap-12 items-start">
        <div>
          <h2 className="lux-eyebrow mb-3">1 · Choose a date</h2>
          <p className="lux-muted text-sm mb-5">Tap a date to see available times.</p>
          {monthsWithDates.map(([monthTitle, monthDates]) => {
            // Align the first bookable day to its weekday column (Monday first).
            const leadingBlanks = (getDay(monthDates[0]) + 6) % 7;
            return (
            <div key={monthTitle} className="mb-8 last:mb-0">
              <h3 className="font-serif text-[1.4rem] text-white mb-3">{monthTitle}</h3>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                  <div
                    key={w}
                    className="text-center text-[11px] tracking-[0.15em] uppercase text-[#4f5868]"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-0">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} aria-hidden />
                ))}
                {monthDates.map((d) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const isPast = dateStr < minBookableDateStr && dateStr !== waitlistAccessDate;
                  const hasSlots = availability[dateStr] ?? true;
                  const isFullyBooked = !isPast && !hasSlots;
                  const isSelected = selectedDate === dateStr;
                  const dayClass = `lux-day ${
                    isSelected
                      ? "lux-day-selected"
                      : isPast
                        ? "lux-day-past"
                        : isFullyBooked
                          ? "lux-day-full"
                          : "lux-day-open"
                  }`;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        if (!isPast) setSelectedDate(dateStr);
                      }}
                      className={dayClass}
                      aria-label={format(d, "EEEE d MMMM")}
                    >
                      {format(d, "d")}
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

        <div ref={timeSectionRef} className="min-h-[200px] scroll-mt-6">
          <h2 className="lux-eyebrow mb-3">2 · Choose a time</h2>
          {!selectedDate ? (
            <p className="lux-muted text-sm">Select a date to see available times.</p>
          ) : slotsLoading ? (
            <p className="lux-muted text-sm">Loading times…</p>
          ) : slots.length === 0 ? (
            selectedDate && selectedDateLabel ? (
              settings?.waitlistEnabled !== false ? (
                <WaitlistJoinForm
                  serviceId={serviceId}
                  technicianId={technicianId}
                  preferredDate={selectedDate}
                  dateLabel={selectedDateLabel}
                  minBookableDate={minBookableDateStr}
                  maxBookableDate={format(calendarEnd, "yyyy-MM-dd")}
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
              <p className="font-serif text-[1.4rem] text-white mb-3">{selectedDateLabel}</p>
              <div className="grid grid-cols-3 gap-2.5 min-w-0">
                {slots.map((slot) => {
                  const wlQuery = waitlistToken
                    ? `?wl=${encodeURIComponent(waitlistToken)}`
                    : "";
                  return (
                  <Link
                    key={slot.start}
                    href={`/book/tech/${technicianId}/${serviceId}/${selectedDate}/${encodeURIComponent(slot.start)}${wlQuery}`}
                    className="lux-time"
                    title={`${formatTime24to12(slot.start)} – ${formatTime24to12(slot.end)}`}
                  >
                    {slot.start}
                  </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
