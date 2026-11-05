"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats } from "@/lib/dashboardStats";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type PeriodId = "today" | "this_month" | "last_3_months" | "last_6_months" | "last_12_months" | "custom";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_month", label: "This month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_6_months", label: "Last 6 months" },
  { id: "last_12_months", label: "Last 12 months" },
  { id: "custom", label: "Custom dates" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function periodRange(
  id: Exclude<PeriodId, "custom">,
  today = new Date()
): { from: string; to: string } {
  const f = (d: Date) => format(d, "yyyy-MM-dd");
  switch (id) {
    case "last_3_months":
      return { from: f(addDays(subMonths(today, 3), 1)), to: f(today) };
    case "last_6_months":
      return { from: f(addDays(subMonths(today, 6), 1)), to: f(today) };
    case "last_12_months":
      return { from: f(addDays(subMonths(today, 12), 1)), to: f(today) };
    case "today":
      return { from: f(today), to: f(today) };
    case "this_month":
      return { from: f(startOfMonth(today)), to: f(endOfMonth(today)) };
  }
}

type DashboardResponse = DashboardStats & { waitlistJoined: number; waitlistBooked: number };

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-charcoal/55">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-charcoal mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-charcoal/45 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

function BarList({
  title,
  rows,
  showRevenue = false,
}: {
  title: string;
  rows: { label: string; count: number; revenue?: number }[];
  showRevenue?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => (showRevenue ? r.revenue ?? 0 : r.count)));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-charcoal mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-charcoal/50">No bookings in this period.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const value = showRevenue ? row.revenue ?? 0 : row.count;
            return (
              <div key={row.label}>
                <div className="flex justify-between gap-2 text-xs text-charcoal/75 mb-1">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums shrink-0">
                    {showRevenue
                      ? `${formatCurrency(row.revenue ?? 0)} · ${row.count}`
                      : row.count}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(value / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState<PeriodId>("today");
  const [technicians, setTechnicians] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [technicianId, setTechnicianId] = useState("all");
  const [customFrom, setCustomFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [stats, setStats] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const customValid = DATE_RE.test(customFrom) && DATE_RE.test(customTo) && customFrom <= customTo;
  const range = useMemo(
    () =>
      period === "custom"
        ? customValid
          ? { from: customFrom, to: customTo }
          : null
        : periodRange(period),
    [period, customFrom, customTo, customValid]
  );
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
      router.replace("/admin");
      return;
    }
    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role !== "master") router.replace("/admin");
        else setReady(true);
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    fetch("/api/admin/technicians", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setTechnicians(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready || !range) return;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/dashboard?from=${range.from}&to=${range.to}&technicianId=${encodeURIComponent(technicianId)}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Could not load stats");
        setStats(data);
      })
      .catch((e) => setError(e?.message ?? "Could not load stats"))
      .finally(() => setLoading(false));
  }, [ready, range, technicianId]);

  const upcoming = Boolean(range && range.from >= todayStr);
  const includesFuture = Boolean(range && range.to > todayStr);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Business stats</h1>
        <Link
          href="/admin"
          className="text-sm text-charcoal/70 hover:text-navy px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>

      {technicians.length > 1 && (
        <select
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          aria-label="Technician"
          className="mb-3 h-[40px] min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-charcoal"
        >
          <option value="all">All technicians</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {!t.active ? " (hidden)" : ""}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap gap-1 p-1 mb-4 rounded-xl border border-slate-200 bg-white">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition ${
              period === p.id ? "bg-navy text-white" : "text-charcoal/70 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3 mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <label className="text-xs text-charcoal/60">
            From
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="block mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-charcoal bg-white min-h-[40px]"
            />
          </label>
          <label className="text-xs text-charcoal/60">
            To
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="block mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-charcoal bg-white min-h-[40px]"
            />
          </label>
          {!customValid && (
            <p className="text-xs text-red-600 pb-2">Choose a start date on or before the end date.</p>
          )}
        </div>
      )}

      {range && (
        <p className="text-xs text-charcoal/50 mb-4">
          {range.from === range.to ? (
            <>Appointments on {format(new Date(`${range.from}T12:00:00`), "EEEE d MMM yyyy")}</>
          ) : (
            <>
              Appointments dated {format(new Date(`${range.from}T12:00:00`), "d MMM yyyy")} –{" "}
              {format(new Date(`${range.to}T12:00:00`), "d MMM yyyy")}
            </>
          )}
          {upcoming
            ? " — upcoming appointments booked so far, not a forecast"
            : includesFuture
              ? " — includes upcoming appointments booked so far"
              : ""}
        </p>
      )}

      {loading && <p className="text-sm text-charcoal/60">Loading stats…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={upcoming ? "Expected takings" : "Takings"}
              value={formatCurrency(stats.revenue)}
              hint="Full price of confirmed appointments"
            />
            <StatCard label="Confirmed appointments" value={String(stats.confirmed)} />
            <StatCard label="Average booking" value={formatCurrency(stats.averageBookingValue)} />
            <StatCard
              label="Deposits taken"
              value={formatCurrency(stats.depositsTaken)}
              hint="On confirmed appointments"
            />
            <StatCard
              label="Cancellations"
              value={`${stats.cancelled} (${stats.cancellationRate}%)`}
              hint={`${stats.cancelledByCustomer} by customers using their link`}
            />
            <StatCard
              label="Deposits kept"
              value={formatCurrency(stats.depositsKept)}
              hint="From late cancellations (non-refundable)"
            />
            <StatCard label="Deposits refunded" value={formatCurrency(stats.refundedDeposits)} />
            <StatCard
              label="Customers"
              value={`${stats.newCustomers} new · ${stats.returningCustomers} returning`}
              hint="New = first-ever appointment with you falls in these dates. Returning = had been before."
            />
            <StatCard label="Moved by customers" value={String(stats.rescheduled)} />
            <StatCard label="Awaiting deposit" value={String(stats.pending)} />
            <StatCard
              label="Waiting list"
              value={`${stats.waitlistJoined} joined · ${stats.waitlistBooked} booked`}
              hint="Sign-ups and bookings made in this period"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <BarList title="Top services" rows={stats.topServices} showRevenue />
            <BarList title="By technician" rows={stats.byTechnician} showRevenue />
            <BarList title="Busiest days" rows={stats.byWeekday} />
            <BarList title="Busiest start times" rows={stats.byHour} />
          </div>
        </div>
      )}
    </div>
  );
}
