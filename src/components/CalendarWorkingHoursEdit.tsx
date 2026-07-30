"use client";

import { useEffect, useRef, useState } from "react";
import WorkingHoursEditor from "@/components/WorkingHoursEditor";
import {
  defaultWeeklyHours,
  type WeeklyWorkingHours,
} from "@/lib/workingHours";

type CalendarWorkingHoursEditProps = {
  /** When set (owner on Staff calendar), save via technicians PATCH; otherwise my-working-hours. */
  technicianId?: string | null;
  isMaster?: boolean;
  getAuthHeaders: () => Record<string, string>;
};

export default function CalendarWorkingHoursEdit({
  technicianId,
  isMaster,
  getAuthHeaders,
}: CalendarWorkingHoursEditProps) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<WeeklyWorkingHours>(defaultWeeklyHours);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSaved(false);

    const load =
      isMaster && technicianId
        ? fetch(`/api/admin/technicians?_=${Date.now()}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error ?? "Could not load hours");
            const list = Array.isArray(data) ? data : [];
            const tech = list.find((t: { id: string }) => t.id === technicianId);
            if (!tech) throw new Error("Technician not found");
            return tech.workingHours as WeeklyWorkingHours | undefined;
          })
        : fetch("/api/admin/my-working-hours", {
            headers: getAuthHeaders(),
            cache: "no-store",
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error ?? "Could not load hours");
            return data.workingHours as WeeklyWorkingHours | undefined;
          });

    load
      .then((wh) => setHours(wh ?? defaultWeeklyHours()))
      .catch((err) => setError(err?.message ?? "Could not load hours"))
      .finally(() => setLoading(false));
  }, [open, isMaster, technicianId, getAuthHeaders]);

  const save = () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const req =
      isMaster && technicianId
        ? fetch(`/api/admin/technicians/${technicianId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ workingHours: hours }),
          })
        : fetch("/api/admin/my-working-hours", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ workingHours: hours }),
          });

    req
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Could not save hours");
        if (data.workingHours) setHours(data.workingHours);
        setSaved(true);
      })
      .catch((err) => setError(err?.message ?? "Could not save hours"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-charcoal hover:bg-slate-50 hover:border-slate-300 transition"
      >
        Hours
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/25 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="fixed z-50 left-4 right-4 top-24 max-h-[min(32rem,calc(100dvh-6rem))] overflow-y-auto sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-[min(calc(100vw-2rem),22rem)] sm:max-h-none rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-charcoal">Working hours</h3>
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className="text-xs text-charcoal/50 hover:text-charcoal"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Set your weekly schedule. Off days are not bookable.
          </p>
          {loading ? (
            <p className="text-sm text-slate-500 py-4">Loading…</p>
          ) : (
            <>
              <WorkingHoursEditor value={hours} onChange={setHours} disabled={saving} />
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              {saved && <p className="text-xs text-emerald-700 mt-2">Hours saved.</p>}
              <button
                type="button"
                onClick={save}
                disabled={saving || loading}
                className="mt-3 w-full h-[38px] rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : "Save hours"}
              </button>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
