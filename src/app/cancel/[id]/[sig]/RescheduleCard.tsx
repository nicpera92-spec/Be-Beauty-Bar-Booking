"use client";

import { useState } from "react";
import { formatBookingDate } from "@/lib/format";

type Slot = { start: string; end: string };

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
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = (nextDate: string) => {
    setDate(nextDate);
    setSelected(null);
    setError(null);
    if (!nextDate) {
      setSlots(null);
      return;
    }
    setLoadingSlots(true);
    fetch(
      `/api/bookings/${encodeURIComponent(id)}/reschedule?s=${encodeURIComponent(sig)}&date=${encodeURIComponent(nextDate)}`,
      { cache: "no-store" }
    )
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
        if (data?.reason === "slot_taken") loadSlots(date);
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
          onClick={() => setOpen(true)}
          className="w-full bg-navy text-white py-3.5 rounded-lg font-medium hover:bg-navy-light transition touch-manipulation min-h-[48px]"
        >
          Change date or time
        </button>
      </div>
    );
  }

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

      <div>
        <label htmlFor="reschedule-date" className="block text-xs text-slate-500 mb-1">
          New date
        </label>
        <input
          id="reschedule-date"
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => loadSlots(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 min-h-[44px]"
        />
      </div>

      {loadingSlots && <p className="text-sm text-slate-500">Loading available times…</p>}

      {!loadingSlots && slots && slots.length === 0 && date && !error && (
        <p className="text-sm text-slate-600">No times available on this day — please try another date.</p>
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
          {saving
            ? "Moving…"
            : `Move to ${formatBookingDate(date, "EEE d MMM")} at ${selected}`}
        </button>
      )}
    </div>
  );
}
