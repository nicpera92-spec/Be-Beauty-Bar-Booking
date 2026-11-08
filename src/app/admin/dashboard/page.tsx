"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats, TrendPoint, YearOnYear } from "@/lib/dashboardStats";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type PeriodId =
  | "today"
  | "this_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "month_year"
  | "custom";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_month", label: "This month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_6_months", label: "Last 6 months" },
  { id: "last_12_months", label: "Last 12 months" },
  { id: "month_year", label: "Month / year" },
  { id: "custom", label: "Custom dates" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** month 1–12, or "all" for the whole year. */
function monthYearRange(year: number, month: number | "all"): { from: string; to: string } {
  if (month === "all") return { from: `${year}-01-01`, to: `${year}-12-31` };
  const start = new Date(year, month - 1, 1);
  return { from: format(start, "yyyy-MM-dd"), to: format(endOfMonth(start), "yyyy-MM-dd") };
}

function rangeLabel(from: string, to: string): string {
  const f = new Date(`${from}T12:00:00`);
  const t = new Date(`${to}T12:00:00`);
  if (from === to) return format(f, "EEE d MMM yyyy");
  if (from.endsWith("-01-01") && to.endsWith("-12-31") && from.slice(0, 4) === to.slice(0, 4)) return from.slice(0, 4);
  if (from.endsWith("-01") && to === format(endOfMonth(f), "yyyy-MM-dd")) return format(f, "MMMM yyyy");
  return `${format(f, "d MMM yyyy")} – ${format(t, "d MMM yyyy")}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function periodRange(
  id: Exclude<PeriodId, "custom" | "month_year">,
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

type DashboardResponse = DashboardStats & {
  waitlistJoined: number;
  waitlistBooked: number;
  trend: TrendPoint[];
  performance: YearOnYear;
  previous: {
    from: string;
    to: string;
    revenue: number;
    confirmed: number;
    averageBookingValue: number;
    newCustomers: number;
    cancellationRate: number;
    repeatRate: number;
  };
  glance: {
    upcomingCount: number;
    upcomingValue: number;
    yearToDate: number;
    lastYearToDate: number;
    totalCustomers: number;
    firstYear: number;
  };
};

type Change = { current: number; previous: number; points?: boolean; lowerIsBetter?: boolean };

/** "▲ 12%" / "▼ 3 pts" compared with the previous period; null when there is nothing to compare. */
function describeChange({ current, previous, points, lowerIsBetter }: Change) {
  if (current === previous) return { text: "same", tone: "flat" as const };
  const up = current > previous;
  const good = lowerIsBetter ? !up : up;
  let amount: string;
  if (points) amount = `${Math.abs(current - previous)} pts`;
  else if (previous === 0) amount = "new";
  else amount = `${Math.round((Math.abs(current - previous) / previous) * 100)}%`;
  return { text: `${up ? "▲" : "▼"} ${amount}`, tone: good ? ("good" as const) : ("bad" as const) };
}

function ChangeBadge({ change, against }: { change: Change; against: string }) {
  const { text, tone } = describeChange(change);
  return (
    <p className="text-[11px] mt-1.5 flex flex-wrap items-center gap-1.5">
      <span
        className={`px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
          tone === "good"
            ? "bg-green-100 text-green-800"
            : tone === "bad"
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-charcoal/60"
        }`}
      >
        {text}
      </span>
      <span className="text-charcoal/45">vs {against}</span>
    </p>
  );
}

function StatCard({
  label,
  value,
  hint,
  change,
  against,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: Change;
  against?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-sky-400/50 bg-sky-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-charcoal/55">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-charcoal mt-1 tabular-nums">{value}</p>
      {change && against && <ChangeBadge change={change} against={against} />}
      {hint && <p className="text-[11px] text-charcoal/45 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

function PerformanceChart({ data, todayStr }: { data: YearOnYear; todayStr: string }) {
  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 52 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const currentYear = Number(todayStr.slice(0, 4));
  // Months that haven't happened yet only count bookings made so far, so stop the line at this month.
  const lastMonth = data.year < currentYear ? 11 : data.year > currentYear ? -1 : Number(todayStr.slice(5, 7)) - 1;
  const max = Math.max(1, ...data.months.map((m) => Math.max(m.thisYear, m.lastYear)));
  const niceMax = Math.ceil(max / 500) * 500 || 500;
  const x = (i: number) => pad.left + (innerW * i) / 11;
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const thisVals = data.months.slice(0, lastMonth + 1).map((m) => m.thisYear);
  const lastVals = data.months.map((m) => m.lastYear);
  const sameSpanLast = data.months.slice(0, lastMonth + 1).reduce((s, m) => s + m.lastYear, 0);
  const sameSpanThis = thisVals.reduce((s, v) => s + v, 0);
  const growth =
    sameSpanLast > 0 ? Math.round(((sameSpanThis - sameSpanLast) / sameSpanLast) * 100) : null;
  const area =
    thisVals.length > 1
      ? `${line(thisVals)} L${x(thisVals.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
      : "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-charcoal">Performance: {data.year} vs {data.year - 1}</p>
          <p className="text-xs text-charcoal/55 mt-0.5">Takings from confirmed appointments, month by month</p>
        </div>
        {growth !== null && lastMonth >= 0 && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              growth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
            }`}
          >
            {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% on {data.year - 1}
            {lastMonth < 11 ? ` (Jan–${data.months[lastMonth].label})` : ""}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-charcoal/70 mb-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-[3px] rounded bg-[#6096f0]" />
          {data.year}
          {lastMonth < 11 ? " so far" : ""}:{" "}
          <span className="text-charcoal font-medium">{formatCurrency(sameSpanThis)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-[#aeb8c7]" />
          {data.year - 1}: <span className="text-charcoal font-medium">{formatCurrency(data.lastYearTotal)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Monthly takings ${data.year} compared with ${data.year - 1}`}>
        <defs>
          <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
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
        <path d={line(lastVals)} fill="none" stroke="#aeb8c7" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.8} />
        {area && <path d={area} fill="url(#perf-fill)" />}
        {thisVals.length > 0 && (
          <path d={line(thisVals)} fill="none" stroke="#6096f0" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {thisVals.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#0b0f1a" stroke="#6096f0" strokeWidth={2}>
            <title>{`${data.months[i].label} ${data.year}: ${formatCurrency(v)} (${data.year - 1}: ${formatCurrency(data.months[i].lastYear)})`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const best = points.reduce<TrendPoint | null>((b, p) => (p.revenue > (b?.revenue ?? 0) ? p : b), null);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <p className="text-sm font-semibold text-charcoal">Takings over time</p>
        {best && (
          <p className="text-xs text-charcoal/55">
            Best: <span className="text-charcoal font-medium">{best.label}</span> · {formatCurrency(best.revenue)}
          </p>
        )}
      </div>
      <div className="flex items-end gap-[3px] h-36" role="img" aria-label="Takings over time">
        {points.map((p) => (
          <div
            key={p.label}
            className="flex-1 min-w-0 h-full flex items-end"
            title={`${p.label}: ${formatCurrency(p.revenue)} · ${p.count} appointment${p.count === 1 ? "" : "s"}`}
          >
            <div
              className={`w-full rounded-t ${p === best ? "bg-sky-400" : "bg-sky-400/45"}`}
              style={{ height: `${Math.max(p.revenue > 0 ? 3 : 0, (p.revenue / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {points.map((p, i) => (
          <div key={p.label} className="flex-1 min-w-0 text-[10px] text-charcoal/45 text-center truncate">
            {i % labelEvery === 0 ? p.label : ""}
          </div>
        ))}
      </div>
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
  const against = stats ? rangeLabel(stats.previous.from, stats.previous.to) : "";
  const glance = stats?.glance;
  const thisYear = todayStr.slice(0, 4);

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

      {glance && (
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50 mb-2">At a glance</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Booked ahead"
              value={formatCurrency(glance.upcomingValue)}
              hint={`${glance.upcomingCount} confirmed appointment${glance.upcomingCount === 1 ? "" : "s"} from today onwards`}
              highlight
            />
            <StatCard
              label={`${thisYear} so far`}
              value={formatCurrency(glance.yearToDate)}
              change={{ current: glance.yearToDate, previous: glance.lastYearToDate }}
              against={`same point in ${Number(thisYear) - 1} (${formatCurrency(glance.lastYearToDate)})`}
            />
            <StatCard
              label="Customers served"
              value={String(glance.totalCustomers)}
              hint="Different people with a confirmed appointment, all time"
            />
          </div>
        </div>
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

      {period === "month_year" && (
        <div className="flex flex-wrap items-end gap-3 mb-4 rounded-xl border border-slate-200 bg-white p-3">
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
              change={{ current: stats.revenue, previous: stats.previous.revenue }}
              against={against}
              highlight
            />
            <StatCard
              label="Confirmed appointments"
              value={String(stats.confirmed)}
              change={{ current: stats.confirmed, previous: stats.previous.confirmed }}
              against={against}
            />
            <StatCard
              label="Average booking"
              value={formatCurrency(stats.averageBookingValue)}
              change={{ current: stats.averageBookingValue, previous: stats.previous.averageBookingValue }}
              against={against}
            />
            <StatCard
              label="Deposits taken"
              value={formatCurrency(stats.depositsTaken)}
              hint="On confirmed appointments"
            />
            <StatCard
              label="Cancellations"
              value={`${stats.cancelled} (${stats.cancellationRate}%)`}
              hint={`${stats.cancelledByCustomer} by customers using their link`}
              change={{
                current: stats.cancellationRate,
                previous: stats.previous.cancellationRate,
                points: true,
                lowerIsBetter: true,
              }}
              against={against}
            />
            <StatCard
              label="Lost to cancellations"
              value={formatCurrency(stats.lostToCancellations)}
              hint="Full price of the appointments that were cancelled"
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
              change={{ current: stats.newCustomers, previous: stats.previous.newCustomers }}
              against={`${against} (new)`}
            />
            <StatCard
              label="Repeat customers"
              value={`${stats.repeatRate}%`}
              hint="Share of customers in this period who had been before"
              change={{ current: stats.repeatRate, previous: stats.previous.repeatRate, points: true }}
              against={against}
            />
            <StatCard label="Moved by customers" value={String(stats.rescheduled)} />
            <StatCard label="Awaiting deposit" value={String(stats.pending)} />
            <StatCard
              label="Waiting list"
              value={`${stats.waitlistJoined} joined · ${stats.waitlistBooked} booked`}
              hint="Sign-ups and bookings made in this period"
            />
          </div>

          <PerformanceChart data={stats.performance} todayStr={todayStr} />
          {stats.trend.length > 1 && <TrendChart points={stats.trend} />}

          <div className="grid md:grid-cols-2 gap-3">
            <BarList title="Top services" rows={stats.topServices} showRevenue />
            <BarList title="Top customers" rows={stats.topCustomers} showRevenue />
            <BarList title="By technician" rows={stats.byTechnician} showRevenue />
            <BarList title="Busiest days" rows={stats.byWeekday} />
            <BarList title="Busiest start times" rows={stats.byHour} />
          </div>
        </div>
      )}
    </div>
  );
}
