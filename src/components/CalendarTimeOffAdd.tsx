"use client";

import { useEffect, useState } from "react";

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
  const [expanded, setExpanded] = useState(false);
  const [startTime, setStartTime] = useState(openTime);
  const [endTime, setEndTime] = useState(closeTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(false);
    setStartTime(openTime);
    setEndTime(closeTime);
    setError(null);
  }, [date, openTime, closeTime]);

  const addBlock = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          startDate: date,
          startTime,
          endDate: date,
          endTime,
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
      setExpanded(false);
      onSuccess();
    } catch {
      setError("Could not add time off.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none";

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-charcoal/50 hover:text-charcoal transition"
      >
        Add time off
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-charcoal">Add time off</p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setExpanded(false);
            setError(null);
          }}
          className="text-xs text-charcoal/50 hover:text-charcoal"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-charcoal/65 mb-1">Start</label>
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
          <label className="block text-xs text-charcoal/65 mb-1">End</label>
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

      <button
        type="button"
        disabled={submitting}
        onClick={addBlock}
        className="w-full px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition"
      >
        {submitting ? "Saving…" : "Save time off"}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
