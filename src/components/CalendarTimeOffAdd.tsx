"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

type CalendarTimeOffAddProps = {
  date: string;
  openTime: string;
  closeTime: string;
  onSuccess: () => void;
  getAuthHeaders: () => Record<string, string>;
};

export default function CalendarTimeOffAdd({
  date,
  openTime,
  closeTime,
  onSuccess,
  getAuthHeaders,
}: CalendarTimeOffAddProps) {
  const [showPartDay, setShowPartDay] = useState(false);
  const [startTime, setStartTime] = useState(openTime);
  const [endTime, setEndTime] = useState(closeTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBlock = async (from: string, to: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          startDate: date,
          startTime: from,
          endDate: date,
          endTime: to,
        }),
      });
      const data = await r.json();
      if (r.status === 409) {
        setError(data.error ?? "You already have a booking during this time.");
        return;
      }
      if (!r.ok) {
        setError(data.error ?? "Could not add time off.");
        return;
      }
      setShowPartDay(false);
      onSuccess();
    } catch {
      setError("Could not add time off.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none";

  return (
    <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-violet-900">Need time off?</p>
        <p className="text-xs text-charcoal/55 mt-0.5">
          Customers won&apos;t be able to book you for blocked times.
        </p>
      </div>

      {!showPartDay ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => addBlock(openTime, closeTime)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-medium hover:bg-violet-800 disabled:opacity-50 transition"
          >
            {submitting ? "Adding…" : `Block whole day (${openTime}–${closeTime})`}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setStartTime(openTime);
              setEndTime(closeTime);
              setShowPartDay(true);
              setError(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-violet-300 bg-white text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 transition"
          >
            Block part of the day
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-charcoal/65 mb-1">From</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={selectClass}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-charcoal/65 mb-1">To</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={selectClass}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => addBlock(startTime, endTime)}
              className="px-4 py-2 rounded-xl bg-violet-700 text-white text-sm font-medium hover:bg-violet-800 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add time off"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowPartDay(false);
                setError(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-charcoal/70 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
