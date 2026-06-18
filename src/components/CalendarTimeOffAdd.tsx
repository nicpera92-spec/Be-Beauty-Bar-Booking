"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

type CalendarTimeOffAddProps = {
  openTime: string;
  closeTime: string;
  defaultDate?: string | null;
  onSuccess: () => void;
  getAuthHeaders: () => Record<string, string>;
};

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function CalendarTimeOffAdd({
  openTime,
  closeTime,
  defaultDate,
  onSuccess,
  getAuthHeaders,
}: CalendarTimeOffAddProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [startTime, setStartTime] = useState(openTime);
  const [endDate, setEndDate] = useState(todayStr());
  const [endTime, setEndTime] = useState(closeTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    const base = defaultDate && defaultDate >= todayStr() ? defaultDate : todayStr();
    setStartDate(base);
    setStartTime(openTime);
    setEndDate(base);
    setEndTime(closeTime);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, defaultDate, openTime, closeTime]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const addBlock = async () => {
    setError(null);
    const startDt = new Date(`${startDate}T${startTime}`);
    const endDt = new Date(`${endDate}T${endTime}`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || endDt <= startDt) {
      setError("End must be after start.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ startDate, startTime, endDate, endTime }),
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
      setOpen(false);
      onSuccess();
    } catch {
      setError("Could not add time off.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-charcoal hover:bg-slate-50 hover:border-slate-300 transition"
      >
        Add time off
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-charcoal">Add time off</p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setOpen(false)}
              className="text-xs text-charcoal/50 hover:text-charcoal"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-charcoal/65 mb-2">Starts</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  min={todayStr()}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStartDate(next);
                    if (endDate < next) setEndDate(next);
                  }}
                  className={fieldClass}
                />
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={fieldClass}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-charcoal/65 mb-2">Ends</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={endDate}
                  min={startDate || todayStr()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={fieldClass}
                />
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={fieldClass}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
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
      )}
    </div>
  );
}
