"use client";

import { useState } from "react";
import { eachDayOfInterval, format, getDay, parse } from "date-fns";
import { formatBookingDate } from "@/lib/format";

type Slot = { start: string; end: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthsBetween(minDate: string, maxDate: string): [string, Date[]][] {
  const days = eachDayOfInterval({
    start: parse(minDate, "yyyy-MM-dd", new Date()),
    end: parse(maxDate, "yyyy-MM-dd", new Date()),
  });
  const map = new Map<string, Date[]>();
  for (const d of days) {
    const key = format(d, "MMMM yyyy");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries());
}

export default function RescheduleCard({
  id,
  sig,
  minDate,
  maxDate,
  onRescheduled,
}: {
  id: string;
  sig: string;
  minDate: string;
  maxDate: string;
  onRescheduled: (booking: { date: string; startTime: string; endTime: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/bookings/${encodeURIComponent(id)}/reschedule?s=${encodeURIComponent(sig)}`;

  const loadCalendar = () => {
    setLoadingCalendar(true);
    setError(null);
    fetch(base, { cache: "no-store" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.availability) setAvailability(data.availability);
        else setError("This booking can't be changed online any more.");
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setLoadingCalendar(false));
  };

  const openPicker = () => {
    setOpen(true);
    if (!availability) loadCalendar();
  };

  const chooseDate = (nextDate: string) => {
    setDate(nextDate);
    setSelected(null);
    setError(null);
    setLoadingSlots(true);
    fetch(`${base}&date=${encodeURIComponent(nextDate)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.slots)) setSlots(data.slots);
        else {
          setSlots([]);
          setError(data?.error ? "This booking can't be changed online any more." : "Could not load times.");
        }
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setLoadingSlots(false));
  };

  const confirmMove = () => {
    if (!date || !selected) return;
    setSaving(true);
    setError(null);
    fetch(`/api/bookings/${encodeURIComponent(id)}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s: sig, date, startTime: selected }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.booking) {
          onRescheduled(data.booking);
          return;
        }
        setError(data?.error ?? "Something went wrong. Please try again.");
        if (data?.reason === "slot_taken") {
          loadCalendar();
          chooseDate(date);
        }
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setSaving(false));
  };

  if (!open) {
    return (
      <div className="rounded-xl border-2 border-slate-300 bg-white px-4 py-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Need a different day or time?</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          You can move this appointment <strong>once</strong>, free of charge — your deposit carries
          over to the new time.
        </p>
        <button
          type="button"
          onClick={openPicker}
          className="w-full bg-navy text-white py-3.5 rounded-lg font-medium hover:bg-navy-light transition touch-manipulation min-h-[48px]"
        >
          Change date or time
        </button>
      </div>
    );
  }

  const openDays = availability
    ? Object.keys(availability).filter((d) => availability[d]).sort()
    : [];

  return (
    <div className="rounded-xl border-2 border-slate-300 bg-white px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Choose a new date and time</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>

      {loadingCalendar && <p className="text-sm text-slate-500">Checking availability…</p>}

      {availability && openDays.length === 0 && (
        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 leading-relaxed">
          Sorry — there are no free times for this service before{" "}
          {formatBookingDate(maxDate, "d MMMM")}. Please contact us and we&apos;ll do our best to help.
        </p>
      )}

      {availability && openDays.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-slate-300 bg-white" /> Free times
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-100" /> Fully booked
            </span>
            {!date && (
              <button
                type="button"
                onClick={() => chooseDate(openDays[0])}
                className="ml-auto text-navy font-medium hover:underline"
              >
                Next free day: {formatBookingDate(openDays[0], "EEE d MMM")}
              </button>
            )}
          </div>

          {monthsBetween(minDate, maxDate).map(([monthTitle, monthDates]) => {
            const leadingBlanks = (getDay(monthDates[0]) + 6) % 7;
            return (
              <div key={monthTitle}>
                <p className="text-sm font-semibold text-navy mb-2">{monthTitle}</p>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="text-center text-[10px] font-medium text-slate-400">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} aria-hidden />
                  ))}
                  {monthDates.map((d) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const free = availability[dateStr] === true;
                    const isSelected = date === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!free}
                        onClick={() => chooseDate(dateStr)}
                        aria-label={`${format(d, "EEEE d MMMM")}${free ? "" : " – fully booked"}`}
                        className={`py-2 rounded-md text-xs font-medium border transition touch-manipulation min-h-[40px] ${
                          isSelected
                            ? "bg-navy text-white border-navy"
                            : free
                              ? "bg-white text-slate-800 border-slate-300 hover:border-slate-500"
                              : "bg-slate-100 text-slate-300 border-transparent cursor-not-allowed"
                        }`}
                      >
                        {format(d, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {date && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-slate-800">
            Times on {formatBookingDate(date, "EEEE d MMMM")}
          </p>
          {loadingSlots && <p className="text-sm text-slate-500">Loading available times…</p>}
          {!loadingSlots && slots && slots.length === 0 && !error && (
            <p className="text-sm text-slate-600">
              That day has just been taken — please choose another date.
            </p>
          )}
          {!loadingSlots && slots && slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelected(slot.start)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition min-h-[44px] ${
                    selected === slot.start
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {slot.start}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {selected && (
        <button
          type="button"
          onClick={confirmMove}
          disabled={saving}
          className="w-full bg-navy text-white py-3.5 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition touch-manipulation min-h-[48px]"
        >
          {saving ? "Moving…" : `Move to ${formatBookingDate(date, "EEE d MMM")} at ${selected}`}
        </button>
      )}
    </div>
  );
}
