"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Booking = {
  id: string;
  service: { name: string };
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
  const [pageSize, setPageSize] = useState(20);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthKey); // "all" | "YYYY-MM"

  useEffect(() => {
    const t = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (t) {
      setToken(t);
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
    setToken(null);
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
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-black disabled:opacity-50 transition touch-manipulation min-h-[48px]"
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

  const monthOptions = (() => {
    const months = new Set<string>();
    for (const b of bookings) {
      if (typeof b.date === "string" && b.date.length >= 7) months.add(b.date.slice(0, 7));
    }
    // Ensure current month exists even if empty
    months.add(currentMonthKey);
    return Array.from(months).sort((a, b) => b.localeCompare(a)); // newest first
  })();

  function monthLabel(key: string) {
    // key: YYYY-MM
    const [y, m] = key.split("-").map((n) => Number(n));
    if (!y || !m) return key;
    const d = new Date(Date.UTC(y, m - 1, 1));
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
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
      const da = a.date + a.startTime;
      const db = b.date + b.startTime;
      return sortDir === "desc" ? db.localeCompare(da) : da.localeCompare(db);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">
          Admin
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/change-password"
            className="text-sm text-sky-600 hover:underline"
          >
            Change password
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-charcoal/60 hover:text-charcoal"
          >
            Log out
          </button>
          <Link
            href="/"
            className="text-sm text-sky-600 hover:underline"
          >
            ← Back to site
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
        <Link
          href="/admin/calendar"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-sm font-medium transition touch-manipulation"
        >
          Calendar
        </Link>
        <Link
          href="/admin/settings"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-sm font-medium transition touch-manipulation"
        >
          Business settings
        </Link>
        <Link
          href="/admin/services"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-sm font-medium transition touch-manipulation"
        >
          Services
        </Link>
        <Link
          href="/admin/time-off"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-charcoal text-sm font-medium transition touch-manipulation"
        >
          Time off
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="font-medium text-charcoal">
            {statusFilter === "confirmed"
              ? `Confirmed (${confirmed.length})`
              : statusFilter === "pending_deposit"
                ? `Pending deposit (${pending.length})`
                : `Cancelled (${cancelled.length})`}
            {statusFilter === "cancelled" && (
              <span className="text-charcoal/50 font-normal text-sm"> — for reference only</span>
            )}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-charcoal text-sm font-medium hover:bg-slate-50 transition"
              title="Toggle sort order"
            >
              Sort: {sortDir === "desc" ? "Newest" : "Oldest"}
            </button>

            <label className="text-sm text-charcoal/60">
              Month{" "}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-charcoal"
              >
                <option value="all">All time</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}{m === currentMonthKey ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("confirmed")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === "confirmed"
                    ? "bg-slate-900 text-white"
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
                    ? "bg-slate-900 text-white"
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
                    ? "bg-slate-900 text-white"
                    : "text-charcoal hover:bg-slate-50"
                }`}
              >
                Cancelled
              </button>
            </div>
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-charcoal/60">
                {monthFilter === "all" ? "All time · " : `From ${rangeStartStr} · `}
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-charcoal/60">
                  Per page{" "}
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-charcoal"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
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
            </div>

            {paged.map((b) => (
              <AdminBookingRow
                key={b.id}
                booking={b}
                getAuthHeaders={getAuthHeaders}
                onUpdate={refreshBookings}
                readOnly={statusFilter === "cancelled"}
              />
            ))}
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
        </p>
        <p className="text-sm text-charcoal/60">
          {booking.customerName} · {booking.customerEmail || booking.customerPhone || "No contact"} · {formatCurrency(booking.depositAmount)} deposit
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
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
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
