"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${i.toString().padStart(2, "0")}:00`
);

type Block = {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

function formatBlockLabel(b: Block): string {
  const startD = parse(b.startDate, "yyyy-MM-dd", new Date());
  const endD = parse(b.endDate, "yyyy-MM-dd", new Date());
  const start = `${b.startTime} ${format(startD, "dd/MM/yy")}`;
  const end = `${b.endTime} ${format(endD, "dd/MM/yy")}`;
  return `${start} to ${end}`;
}

export default function AdminTimeOffPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    startDate: "",
    startTime: "10:00",
    endDate: "",
    endTime: "13:00",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasToken(!!sessionStorage.getItem(ADMIN_TOKEN_KEY));
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/admin/blocks?from=${today}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return [];
        }
        return r.json();
      })
      .then((data) => setBlocks(Array.isArray(data) ? data : []))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [hasToken]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const startDt = new Date(`${form.startDate}T${form.startTime}`);
    const endDt = new Date(`${form.endDate}T${form.endTime}`);
    if (endDt <= startDt) {
      setError("End date/time must be after start date/time.");
      return;
    }
    setSubmitting(true);
    fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        startDate: form.startDate,
        startTime: form.startTime,
        endDate: form.endDate,
        endTime: form.endTime,
      }),
    })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        return r.json().then((data) => ({ status: r.status, data }));
      })
      .then((res) => {
        if (!res) return;
        if (res.status === 409) {
          setError(res.data?.error ?? "A customer is already booked during this period.");
          return;
        }
        if (res.status >= 400) {
          setError(res.data?.error ?? "Failed to add time off.");
          return;
        }
        const block = res.data;
        setBlocks((prev) =>
          [...prev, block].sort(
            (a, b) =>
              a.startDate.localeCompare(b.startDate) ||
              a.startTime.localeCompare(b.startTime)
          )
        );
        setForm((f) => ({
          ...f,
          startDate: "",
          endDate: "",
        }));
      })
      .catch(() => setError("Failed to add time off."))
      .finally(() => setSubmitting(false));
  };

  const remove = (id: string) => {
    if (!confirm("Remove this time off?")) return;
    fetch(`/api/admin/blocks/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return;
        }
        if (r.ok) setBlocks((prev) => prev.filter((b) => b.id !== id));
      })
      .catch(() => {});
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-2">
        Time off & days off
      </h1>
      <p className="text-charcoal/60 text-sm mb-8">
        Block a date range (e.g. 10:00 28/01/26 to 13:00 29/01/26) so customers cannot book.
        Time is by the hour. You cannot add time off if a customer is already booked in that period.
      </p>

      <form onSubmit={submit} className="space-y-6 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-charcoal mb-3">From</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-charcoal/70 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/70 mb-1">Time (hour)</label>
                <select
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
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
          <div>
            <h3 className="text-sm font-medium text-charcoal mb-3">To</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-charcoal/70 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal/70 mb-1">Time (hour)</label>
                <select
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
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
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition"
        >
          {submitting ? "Adding…" : "Add time off"}
        </button>
      </form>

      <h2 className="font-medium text-charcoal mb-4">Upcoming time off</h2>
      {loading ? (
        <p className="text-charcoal/60 text-sm">Loading…</p>
      ) : blocks.length === 0 ? (
        <p className="text-charcoal/60 text-sm">
          No time off set. Use the form above to block a range (e.g. 10:00 28/01/26 to 13:00 29/01/26).
        </p>
      ) : (
        <div className="space-y-3">
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white"
            >
              <p className="font-medium text-charcoal text-sm sm:text-base">
                {formatBlockLabel(b)}
              </p>
              <button
                type="button"
                onClick={() => remove(b.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
