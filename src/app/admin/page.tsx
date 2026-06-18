"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCurrency, formatBookingDateFriendly } from "@/lib/format";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";

const ADMIN_TOKEN_KEY = "admin-token";
const ADMIN_ROLE_KEY = "admin-role";
const ADMIN_NAME_KEY = "admin-name";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const iconProps = {
  className: "w-[18px] h-[18px]",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.7,
  stroke: "currentColor",
} as const;

const NAV_ICONS: Record<string, React.ReactNode> = {
  calendar: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 6h15a.75.75 0 01.75.75v12.75a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6.75A.75.75 0 014.5 6z" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  technicians: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  timeoff: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  services: (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

type Booking = {
  id: string;
  service: { name: string };
  technician?: { name: string } | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  depositAmount: number;
  balancePaidOnline: boolean;
  status: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  notes: string | null;
  stripeDepositPaymentIntentId: string | null;
  stripeBalancePaymentIntentId: string | null;
  depositRefundedAt: string | null;
  balanceRefundedAt: string | null;
  createdAt: string;
};

function navShortLabel(label: string): string {
  if (label === "Technicians") return "Staff";
  if (label === "My services") return "Services";
  if (label === "My calendar") return "Calendar";
  if (label === "My time off") return "Time off";
  return label;
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminPage() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "confirmed" | "pending_deposit" | "cancelled"
  >("confirmed");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<string>(""); // yyyy-MM-dd; empty = all dates
  const [monthFilter] = useState<string>("all"); // bookings list shows all time
  const [staffRole, setStaffRole] = useState<"master" | "technician">("master");
  const [staffName, setStaffName] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
    const role = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_ROLE_KEY) : null;
    const name = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_NAME_KEY) : null;
    if (t) {
      setToken(t);
      setStaffRole(role === "technician" ? "technician" : "master");
      setStaffName(name);

      // Sync role from server so older sessions (token without admin-role) work.
      fetch("/api/admin/verify-session", {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.role) return;
          sessionStorage.setItem(ADMIN_ROLE_KEY, data.role);
          setStaffRole(data.role === "technician" ? "technician" : "master");
          if (data.name) {
            sessionStorage.setItem(ADMIN_NAME_KEY, data.name);
            setStaffName(data.name);
          }
        })
        .catch(() => {});
    } else {
      // Ensure email is cleared if no token exists
      setEmail("");
      setPassword("");
    }
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) throw new Error(data.error);
        sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        if (data.role) {
          sessionStorage.setItem(ADMIN_ROLE_KEY, data.role);
          setStaffRole(data.role === "technician" ? "technician" : "master");
        }
        if (data.name) {
          sessionStorage.setItem(ADMIN_NAME_KEY, data.name);
          setStaffName(data.name);
        }
        setToken(data.token);
        const bookRes = await fetch("/api/bookings", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (bookRes.status === 401) return [];
        return bookRes.json();
      })
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch((err) => {
        setError(err?.message ?? "Login failed");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetch("/api/bookings", { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          setToken(null);
          return [];
        }
        return r.json();
      })
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    // Reset pagination when switching tabs / filters
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    // Reset pagination when switching sorting or date filter
    setPage(1);
  }, [sortDir, dateFilter]);

  useEffect(() => {
    // Reset pagination when switching month
    setPage(1);
  }, [monthFilter]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetch("/api/bookings", { headers: getAuthHeaders() })
        .then((r) => {
          if (r.status === 401) return null;
          return r.json();
        })
        .then((data) => {
          if (Array.isArray(data)) setBookings(data);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const refreshBookings = () => {
    if (!token) return;
    fetch("/api/bookings", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_ROLE_KEY);
    sessionStorage.removeItem(ADMIN_NAME_KEY);
    setToken(null);
    setStaffRole("master");
    setStaffName(null);
    setEmail("");
    setPassword("");
  };

  if (!token) {
    return (
      <div className="max-w-sm mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h1 className="font-serif text-2xl font-semibold text-charcoal mb-6 text-center">
          Admin
        </h1>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[48px]"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white min-h-[48px]"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white py-3 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition touch-manipulation min-h-[48px]"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="text-xs text-charcoal/50 mt-4 text-center">
          Enter your admin email and password to sign in.
        </p>
      </div>
    );
  }

  function nextMonthStart(key: string) {
    const [yStr, mStr] = key.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) return null;
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() + 1);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  }

  const rangeStartStr = monthFilter === "all" ? null : `${monthFilter}-01`;
  const rangeEndStr = monthFilter === "all" ? null : nextMonthStart(monthFilter);

  const inVisibleRange = (b: Booking) => {
    if (dateFilter) return b.date === dateFilter;
    if (!rangeStartStr || !rangeEndStr) return true;
    return b.date >= rangeStartStr && b.date < rangeEndStr;
  };

  const pending = bookings.filter(
    (b) => b.status === "pending_deposit" && inVisibleRange(b)
  );
  const confirmed = bookings.filter(
    (b) => b.status === "confirmed" && inVisibleRange(b)
  );
  const cancelled = bookings.filter(
    (b) => b.status === "cancelled" && inVisibleRange(b)
  );

  const filtered = (
    statusFilter === "confirmed"
      ? confirmed
      : statusFilter === "pending_deposit"
        ? pending
        : cancelled
  )
    .slice()
    .sort((a, b) => {
      // "Newest" = most recently booked (by creation time), not appointment date.
      const da = a.createdAt ?? "";
      const db = b.createdAt ?? "";
      return sortDir === "desc" ? db.localeCompare(da) : da.localeCompare(db);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const navItems =
    staffRole === "master"
      ? [
          { href: "/admin/calendar", label: "Calendar", icon: NAV_ICONS.calendar },
          { href: "/admin/technicians", label: "Technicians", icon: NAV_ICONS.technicians },
          { href: "/admin/time-off", label: "Time off", icon: NAV_ICONS.timeoff },
          { href: "/admin/services", label: "Services", icon: NAV_ICONS.services },
        ]
      : [
          { href: "/admin/services", label: "My services", icon: NAV_ICONS.services },
          { href: "/admin/calendar", label: "My calendar", icon: NAV_ICONS.calendar },
          { href: "/admin/time-off", label: "My time off", icon: NAV_ICONS.timeoff },
        ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-lg sm:text-xl font-semibold text-charcoal leading-tight truncate">
              Hello{staffName ? `, ${staffName}` : ""}
            </h1>
              <span
                className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  staffRole === "master"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-navy/10 text-navy"
                }`}
              >
                {staffRole === "master" ? "Owner" : "Technician"}
              </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg text-sm text-charcoal/70 hover:text-charcoal hover:bg-slate-50 transition"
            >
              ← Back to site
            </Link>
            {staffRole === "master" ? (
              <Link
                href="/admin/settings"
                title="Business settings"
                aria-label="Business settings"
                className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 text-charcoal/70 hover:text-navy hover:bg-slate-50 hover:border-slate-300 transition"
              >
                {NAV_ICONS.settings}
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/change-password"
                  className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg text-sm text-charcoal/70 hover:text-charcoal hover:bg-slate-50 transition"
                >
                  Change password
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-charcoal hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>

        <nav className="px-3 pb-3 sm:px-5 sm:pb-0">
          {/* Mobile: compact icon grid */}
          <div
            className={`grid gap-1 p-1 sm:hidden ${
              navItems.length === 3 ? "grid-cols-3" : "grid-cols-4"
            }`}
          >
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition touch-manipulation ${
                    active ? "bg-navy text-white" : "text-charcoal hover:bg-slate-50"
                  }`}
                >
                  <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                  <span className="text-[11px] font-medium leading-tight text-center px-1">
                    {navShortLabel(item.label)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Desktop: linear underline tabs */}
          <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-1">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`group inline-flex items-center gap-2 min-h-[44px] py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors touch-manipulation ${
                    active
                      ? "border-navy text-navy"
                      : "border-transparent text-charcoal/70 hover:text-navy hover:border-navy"
                  }`}
                >
                  <span
                    className={`transition-colors ${
                      active ? "text-navy" : "text-slate-400 group-hover:text-navy"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <section>
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-2 space-y-2">
          {/* Status tabs with live counts (replaces the heading) */}
          <div className="grid grid-cols-3 gap-1">
            {([
              { key: "confirmed", label: "Confirmed", count: confirmed.length },
              { key: "pending_deposit", label: "Pending", count: pending.length },
              { key: "cancelled", label: "Cancelled", count: cancelled.length },
            ] as const).map((t) => {
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusFilter(t.key)}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition ${
                    active ? "bg-navy text-white" : "text-charcoal hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-medium leading-tight">{t.label}</span>
                  <span className={`text-xs tabular-nums ${active ? "text-white/80" : "text-charcoal/50"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact controls: sort · date · per page */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              title="Toggle sort order"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-charcoal text-sm font-medium hover:bg-slate-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1v8.59a.75.75 0 0 0 1.5 0V4.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L2.2 5.74a.75.75 0 0 0 .04 1.06Zm8 6.4a.75.75 0 0 0-.04 1.06l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.25a.75.75 0 0 0-1.5 0v9.09l-1.95-2.1a.75.75 0 0 0-1.06-.04Z" clipRule="evenodd" />
              </svg>
              {sortDir === "desc" ? "Newest" : "Oldest"}
            </button>

            <div className="relative flex-1 min-w-[130px]">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                title="Filter by date"
                aria-label="Filter by date"
                className={`w-full rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 py-2 text-sm text-charcoal ${
                  !dateFilter ? "text-transparent" : ""
                }`}
              />
              {!dateFilter && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center gap-1.5 pl-2.5 pr-7 text-sm text-charcoal/50"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 shrink-0 text-slate-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Choose date
                </span>
              )}
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  aria-label="Clear date filter"
                  title="Clear date"
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full text-charcoal/50 hover:bg-slate-100 hover:text-charcoal transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              title="Results per page"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-charcoal"
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-charcoal/60 text-sm">
            {statusFilter === "confirmed"
              ? "No confirmed bookings yet."
              : statusFilter === "pending_deposit"
                ? "No bookings awaiting deposit."
                : "No cancelled bookings."}
          </p>
        ) : (
          <div className="space-y-3">
            {paged.map((b) => (
              <AdminBookingRow
                key={b.id}
                booking={b}
                getAuthHeaders={getAuthHeaders}
                onUpdate={refreshBookings}
                readOnly={statusFilter === "cancelled"}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-charcoal/70 tabular-nums">
                  {safePage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-charcoal text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminBookingRow({
  booking,
  getAuthHeaders,
  onUpdate,
  readOnly = false,
}: {
  booking: Booking;
  getAuthHeaders: () => Record<string, string>;
  onUpdate: () => void;
  readOnly?: boolean;
}) {
  const [updating, setUpdating] = useState(false);
  const [refunding, setRefunding] = useState<"deposit" | "balance" | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const confirmDeposit = () => {
    setUpdating(true);
    setRefundError(null);
    fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "confirmed" }),
    })
      .then(() => onUpdate())
      .finally(() => setUpdating(false));
  };

  const cancel = () => {
    if (!confirm("Cancel this booking?")) return;
    setUpdating(true);
    setRefundError(null);
    fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status: "cancelled" }),
    })
      .then(() => onUpdate())
      .finally(() => setUpdating(false));
  };

  const refund = (type: "deposit" | "balance") => {
    const label = type === "deposit" ? "deposit" : "balance";
    if (!confirm(`Refund ${label} via Stripe? The customer will be refunded.`)) return;
    setRefunding(type);
    setRefundError(null);
    fetch("/api/admin/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ bookingId: booking.id, type }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        onUpdate();
      })
      .catch((err) => setRefundError(err?.message ?? "Refund failed"))
      .finally(() => setRefunding(null));
  };

  const canRefundDeposit =
    booking.status === "confirmed" &&
    booking.stripeDepositPaymentIntentId &&
    !booking.depositRefundedAt;
  const canRefundBalance =
    booking.balancePaidOnline &&
    booking.stripeBalancePaymentIntentId &&
    !booking.balanceRefundedAt;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-white ${readOnly ? "border-slate-100 bg-slate-50/50" : "border-slate-200"}`}>
      <div>
        <p className="font-medium text-charcoal">
          {booking.service.name} · {formatBookingDateFriendly(booking.date)} {booking.startTime}–{booking.endTime}
          {booking.technician?.name && (
            <span className="text-charcoal/60 font-normal"> · {booking.technician.name}</span>
          )}
        </p>
        <p className="text-sm text-charcoal/60">
          {booking.customerName} ·{" "}
          {booking.customerPhone ? (
            <CopyPhoneButton phone={booking.customerPhone} />
          ) : (
            booking.customerEmail || "No contact"
          )}{" "}
          · {formatCurrency(booking.depositAmount)} deposit
          {booking.balancePaidOnline && " · balance paid online"}
          {booking.depositRefundedAt && " · deposit refunded"}
          {booking.balanceRefundedAt && " · balance refunded"}
        </p>
        {booking.notes && booking.notes.trim() && (
          <p className="text-sm text-navy mt-2 italic">
            📝 Special request: {booking.notes}
          </p>
        )}
        {refundError && (
          <p className="text-sm text-red-600 mt-2">{refundError}</p>
        )}
      </div>
      {readOnly ? (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium">
            <span className="text-red-600">Cancelled</span>
            <span className="text-slate-500"> — for reference only</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Remove this cancelled booking from the list? This cannot be undone.")) return;
              setUpdating(true);
              fetch(`/api/bookings/${booking.id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
              })
                .then((r) => (r.ok ? onUpdate() : Promise.reject()))
                .catch(() => {})
                .finally(() => setUpdating(false));
            }}
            disabled={updating}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-charcoal/70 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          {canRefundDeposit && (
            <button
              type="button"
              onClick={() => refund("deposit")}
              disabled={updating || refunding !== null}
              className="px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              {refunding === "deposit" ? "Refunding…" : "Refund deposit"}
            </button>
          )}
          {canRefundBalance && (
            <button
              type="button"
              onClick={() => refund("balance")}
              disabled={updating || refunding !== null}
              className="px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              {refunding === "balance" ? "Refunding…" : "Refund balance"}
            </button>
          )}
          {booking.status === "pending_deposit" && (
            <button
              type="button"
              onClick={confirmDeposit}
              disabled={updating}
              className="px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50"
            >
              Mark deposit paid
            </button>
          )}
          {booking.status !== "cancelled" && (
            <button
              type="button"
              onClick={cancel}
              disabled={updating}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
