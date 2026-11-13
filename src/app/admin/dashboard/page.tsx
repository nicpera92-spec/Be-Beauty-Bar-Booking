"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats, YearOnYear } from "@/lib/dashboardStats";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type PeriodId = "today" | "this_month" | "last_3_months" | "last_12_months" | "month_year" | "custom";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_month", label: "This month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_12_months", label: "Last 12 months" },
  { id: "month_year", label: "Month / year" },
  { id: "custom", label: "Custom dates" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function periodRange(
  id: Exclude<PeriodId, "custom" | "month_year">,
  today = new Date()
): { from: string; to: string } {
  const f = (d: Date) => format(d, "yyyy-MM-dd");
  switch (id) {
    case "last_3_months":
      return { from: f(addDays(subMonths(today, 3), 1)), to: f(today) };
    case "last_12_months":
      return { from: f(addDays(subMonths(today, 12), 1)), to: f(today) };
    case "today":
      return { from: f(today), to: f(today) };
    case "this_month":
      return { from: f(startOfMonth(today)), to: f(endOfMonth(today)) };
  }
}

/** month 1–12, or "all" for the whole year. */
function monthYearRange(year: number, month: number | "all"): { from: string; to: string } {
  if (month === "all") return { from: `${year}-01-01`, to: `${year}-12-31` };
  const start = new Date(year, month - 1, 1);
  return { from: format(start, "yyyy-MM-dd"), to: format(endOfMonth(start), "yyyy-MM-dd") };
}

function rangeLabel(from: string, to: string): string {
  const f = new Date(`${from}T12:00:00`);
  const t = new Date(`${to}T12:00:00`);
  if (from === to) return format(f, "EEEE d MMMM yyyy");
  if (from.endsWith("-01-01") && to.endsWith("-12-31") && from.slice(0, 4) === to.slice(0, 4)) return from.slice(0, 4);
  if (from.endsWith("-01") && to === format(endOfMonth(f), "yyyy-MM-dd")) return format(f, "MMMM yyyy");
  return `${format(f, "d MMM yyyy")} – ${format(t, "d MMM yyyy")}`;
}

type DashboardResponse = DashboardStats & {
  performance: YearOnYear;
  previous: { from: string; to: string; revenue: number; confirmed: number; newCustomers: number };
  glance: {
    upcomingCount: number;
    upcomingValue: number;
    yearToDate: number;
    lastYearToDate: number;
    totalCustomers: number;
    firstYear: number;
  };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "▲ 12% vs October 2026" — only shown when there is a fair previous figure to compare with. */
function Change({ current, previous, against }: { current: number; previous: number; against: string }) {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone =
    pct > 0 ? "bg-green-100 text-green-800" : pct < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-charcoal/60";
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className={`px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${tone}`}>
        {pct > 0 ? "▲" : pct < 0 ? "▼" : ""} {pct === 0 ? "Same" : `${Math.abs(pct)}%`}
      </span>
      <span className="text-charcoal/45">vs {against}</span>
    </p>
  );
}

function Card({
  label,
  value,
  hint,
  children,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${highlight ? "border-sky-400/50 bg-sky-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-charcoal/55">{label}</p>
      <p className="text-2xl sm:text-[1.7rem] font-semibold text-charcoal mt-1 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-xs text-charcoal/50 mt-1.5 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50 mb-2">{children}</p>;
}

function MonthlyChart({ data, todayStr }: { data: YearOnYear; todayStr: string }) {
  const W = 640;
  const H = 210;
  const pad = { top: 14, right: 12, bottom: 28, left: 52 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const currentYear = Number(todayStr.slice(0, 4));
  // Later months only hold bookings made so far, so the line stops at the current month.
  const lastMonth = data.year < currentYear ? 11 : data.year > currentYear ? -1 : Number(todayStr.slice(5, 7)) - 1;
  const hasLastYear = data.lastYearTotal > 0;
  const thisVals = data.months.slice(0, lastMonth + 1).map((m) => m.thisYear);
  const lastVals = data.months.map((m) => m.lastYear);
  const max = Math.max(1, ...thisVals, ...(hasLastYear ? lastVals : []));
  const niceMax = Math.ceil(max / 500) * 500 || 500;
  const x = (i: number) => pad.left + (innerW * i) / 11;
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area =
    thisVals.length > 1
      ? `${line(thisVals)} L${x(thisVals.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
      : "";
  const total = thisVals.reduce((s, v) => s + v, 0);
  const lastSameSpan = data.months.slice(0, lastMonth + 1).reduce((s, m) => s + m.lastYear, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-charcoal">Takings by month</p>
          <p className="text-xs text-charcoal/50 mt-0.5">
            {data.year}
            {lastMonth < 11 && lastMonth >= 0 ? " so far" : ""}: {formatCurrency(total)}
            {hasLastYear && ` · ${data.year - 1}: ${formatCurrency(data.lastYearTotal)}`}
          </p>
        </div>
        {hasLastYear && lastMonth >= 0 && (
          <Change current={total} previous={lastSameSpan} against={`${data.year - 1}${lastMonth < 11 ? ` (Jan–${data.months[lastMonth].label})` : ""}`} />
        )}
      </div>
      {hasLastYear && (
        <div className="flex gap-4 text-[11px] text-charcoal/55 mb-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-[3px] rounded bg-[#6096f0]" />
            {data.year}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-[#aeb8c7]" />
            {data.year - 1}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Takings by month in ${data.year}`}>
        <defs>
          <linearGradient id="monthly-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6096f0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6096f0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke="currentColor" className="text-slate-200" strokeWidth={1} />
            <text x={pad.left - 8} y={y(niceMax * f) + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-charcoal/45">
              £{Math.round(niceMax * f).toLocaleString("en-GB")}
            </text>
          </g>
        ))}
        {data.months.map((m, i) => (
          <text key={m.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" className="text-charcoal/45">
            {m.label}
          </text>
        ))}
        {hasLastYear && (
          <path d={line(lastVals)} fill="none" stroke="#aeb8c7" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.8} />
        )}
        {area && <path d={area} fill="url(#monthly-fill)" />}
        {thisVals.length > 0 && (
          <path d={line(thisVals)} fill="none" stroke="#6096f0" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {thisVals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#0b0f1a" stroke="#6096f0" strokeWidth={2}>
            <title>
              {`${data.months[i].label} ${data.year}: ${formatCurrency(v)}${hasLastYear ? ` (${data.year - 1}: ${formatCurrency(data.months[i].lastYear)})` : ""}`}
            </title>
          </circle>
        ))}
      </svg>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold text-charcoal mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-charcoal/50">No appointments in this period.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const value = showRevenue ? row.revenue ?? 0 : row.count;
            return (
              <div key={row.label}>
                <div className="flex justify-between gap-2 text-xs text-charcoal/75 mb-1">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums shrink-0">
                    {showRevenue ? `${formatCurrency(row.revenue ?? 0)} · ${plural(row.count, "visit")}` : row.count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
  const [pickYear, setPickYear] = useState(() => new Date().getFullYear());
  const [pickMonth, setPickMonth] = useState<number | "all">(() => new Date().getMonth() + 1);
  const [firstYear, setFirstYear] = useState(() => new Date().getFullYear() - 1);
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
        : period === "month_year"
          ? monthYearRange(pickYear, pickMonth)
          : periodRange(period),
    [period, customFrom, customTo, customValid, pickYear, pickMonth]
  );
  const yearOptions = useMemo(() => {
    const last = new Date().getFullYear() + 1;
    const years: number[] = [];
    for (let y = last; y >= Math.min(firstYear, last - 1); y--) years.push(y);
    return years;
  }, [firstYear]);
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
        if (data?.glance?.firstYear) setFirstYear(data.glance.firstYear);
      })
      .catch((e) => setError(e?.message ?? "Could not load stats"))
      .finally(() => setLoading(false));
  }, [ready, range, technicianId]);

  const upcoming = Boolean(range && range.from >= todayStr);
  const includesFuture = Boolean(range && range.to > todayStr);
  // Only finished periods of more than a day get compared, so part-way figures never look like a drop.
  const comparable = Boolean(range && range.from !== range.to && !includesFuture);
  const against =
    period === "last_3_months"
      ? "previous 3 months"
      : period === "last_12_months"
        ? "previous 12 months"
        : period === "custom"
          ? "the same length of time before"
          : stats
            ? rangeLabel(stats.previous.from, stats.previous.to)
            : "";
  const glance = stats?.glance;
  const thisYear = Number(todayStr.slice(0, 4));
  const showByTechnician = technicianId === "all" && (stats?.byTechnician.length ?? 0) > 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Business stats</h1>
        <div className="flex items-center gap-2">
          {technicians.length > 1 && (
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              aria-label="Technician"
              className="h-[40px] min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-charcoal"
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
          <Link
            href="/admin"
            className="h-[40px] inline-flex items-center text-sm text-charcoal/70 hover:text-navy px-3 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            ← Admin
          </Link>
        </div>
      </div>

      {glance && (
        <section>
          <SectionTitle>Overview</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card
              label="Booked ahead"
              value={formatCurrency(glance.upcomingValue)}
              hint={`${plural(glance.upcomingCount, "confirmed appointment")} coming up`}
              highlight
            />
            <Card
              label={`${thisYear} so far`}
              value={formatCurrency(glance.yearToDate)}
              hint={glance.lastYearToDate > 0 ? undefined : "Takings from appointments so far this year"}
            >
              <Change current={glance.yearToDate} previous={glance.lastYearToDate} against={`this time last year (${formatCurrency(glance.lastYearToDate)})`} />
            </Card>
            <Card label="Clients" value={String(glance.totalCustomers)} hint="Different people who have had an appointment" />
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Choose a period</SectionTitle>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-slate-200 bg-white">
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

        {period === "month_year" && (
          <div className="flex flex-wrap items-end gap-3 mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <label className="text-xs text-charcoal/60">
              Month
              <select
                value={pickMonth}
                onChange={(e) => setPickMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="block mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-charcoal bg-white min-h-[40px] min-w-[150px]"
              >
                <option value="all">Whole year</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-charcoal/60">
              Year
              <select
                value={pickYear}
                onChange={(e) => setPickYear(Number(e.target.value))}
                className="block mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-charcoal bg-white min-h-[40px] min-w-[110px]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-3 mt-3 rounded-xl border border-slate-200 bg-white p-3">
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
          <p className="text-sm text-charcoal/70 mt-4">
            <span className="font-medium text-charcoal">{rangeLabel(range.from, range.to)}</span>
            {upcoming ? (
              <span className="text-charcoal/50"> · appointments booked so far</span>
            ) : includesFuture ? (
              <span className="text-charcoal/50"> · includes upcoming appointments</span>
            ) : null}
          </p>
        )}

        {loading && !stats && <p className="text-sm text-charcoal/60 mt-4">Loading stats…</p>}
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        {stats && (
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
            <Card
              label={upcoming ? "Expected takings" : "Takings"}
              value={formatCurrency(stats.revenue)}
              hint={stats.confirmed > 0 ? `Average ${formatCurrency(stats.averageBookingValue)} per appointment` : undefined}
              highlight
            >
              {comparable && <Change current={stats.revenue} previous={stats.previous.revenue} against={against} />}
            </Card>
            <Card
              label="Appointments"
              value={String(stats.confirmed)}
              hint={stats.pending > 0 ? `+ ${stats.pending} waiting for a deposit` : "Confirmed"}
            >
              {comparable && <Change current={stats.confirmed} previous={stats.previous.confirmed} against={against} />}
            </Card>
            <Card
              label="New clients"
              value={String(stats.newCustomers)}
              hint={`${plural(stats.returningCustomers, "returning client")}`}
            >
              {comparable && <Change current={stats.newCustomers} previous={stats.previous.newCustomers} against={against} />}
            </Card>
            <Card
              label="Cancellations"
              value={String(stats.cancelled)}
              hint={
                stats.cancelled > 0
                  ? `${stats.cancellationRate}% of bookings${stats.depositsKept > 0 ? ` · ${formatCurrency(stats.depositsKept)} in deposits kept` : ""}`
                  : "None"
              }
            />
          </div>
        )}
      </section>

      {stats && (
        <section className={`space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <MonthlyChart data={stats.performance} todayStr={todayStr} />
          <div className="grid md:grid-cols-2 gap-3">
            <BarList title="Top services" rows={stats.topServices.slice(0, 5)} showRevenue />
            <BarList title="Best clients" rows={stats.topCustomers} showRevenue />
            {range && range.from !== range.to && <BarList title="Busiest days" rows={stats.byWeekday} />}
            {showByTechnician && <BarList title="By technician" rows={stats.byTechnician} showRevenue />}
          </div>
        </section>
      )}
    </div>
  );
}
