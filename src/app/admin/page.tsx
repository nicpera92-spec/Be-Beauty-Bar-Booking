"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
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

export default function AdminPage() {
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
  const [monthFilter] = useState<string>("all"); // bookings list shows all time
  const [staffRole, setStaffRole] = useState<"master" | "technician">("master");
  const [staffName, setStaffName] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Be Beauty Bar");

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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.businessName) setBusinessName(data.businessName);
      })
      .catch(() => {});
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
    // Reset pagination when switching sorting
    setPage(1);
  }, [sortDir]);

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
      <header className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100">
          <div className="min-w-0">
            <span className="block font-serif text-sm font-light uppercase tracking-[0.22em] text-navy truncate">
              {businessName}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal leading-tight truncate">
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

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 sm:px-5">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="group inline-flex items-center gap-2 min-h-[44px] py-2.5 -mb-px border-b-2 border-transparent text-charcoal/70 text-sm font-medium hover:text-navy hover:border-navy transition-colors touch-manipulation"
            >
              <span className="text-slate-400 group-hover:text-navy transition-colors">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <section>
        <div className="flex items-center gap-3 mb-4 flex-nowrap overflow-x-auto">
          <h2 className="font-medium text-charcoal mr-auto shrink-0 whitespace-nowrap">
            {statusFilter === "confirmed"
              ? `Confirmed (${confirmed.length})`
              : statusFilter === "pending_deposit"
                ? `Pending deposit (${pending.length})`
                : `Cancelled (${cancelled.length})`}
            {statusFilter === "cancelled" && (
              <span className="text-charcoal/50 font-normal text-sm"> — for reference only</span>
            )}
          </h2>
          <label className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 shrink-0 whitespace-nowrap">
              Per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-charcoal"
              >
                {[5, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-charcoal text-sm font-medium hover:bg-slate-50 transition"
              title="Toggle sort order"
            >
              Sort: {sortDir === "desc" ? "Newest" : "Oldest"}
            </button>

            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("confirmed")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === "confirmed"
                    ? "bg-navy text-white"
                    : "text-charcoal hover:bg-slate-50"
                }`}
              >
                Confirmed
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending_deposit")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === "pending_deposit"
                    ? "bg-navy text-white"
                    : "text-charcoal hover:bg-slate-50"
                }`}
              >
                Pending deposit
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === "cancelled"
                    ? "bg-navy text-white"
                    : "text-charcoal hover:bg-slate-50"
                }`}
              >
                Cancelled
              </button>
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
          {booking.service.name} · {booking.date} {booking.startTime}–{booking.endTime}
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
