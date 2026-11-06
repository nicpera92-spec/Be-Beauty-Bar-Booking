"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate } from "@/lib/format";
import { HomeBackLinks } from "@/components/PageTopLinks";

const TOKEN_KEY = "customer-portal-token";

type PortalBooking = {
  id: string;
  serviceName: string;
  technicianName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  upcoming: boolean;
  manageUrl: string | null;
  payDepositUrl: string | null;
};

type Step = "contact" | "code" | "list";

const inputClass =
  "lux-input";
const primaryButton =
  "lux-btn w-full";

function statusLabel(b: PortalBooking): { text: string; className: string } {
  if (b.status === "cancelled") return { text: "Cancelled", className: "bg-slate-100 text-slate-500" };
  if (b.status === "pending_deposit") return { text: "Awaiting deposit", className: "bg-amber-50 text-amber-700" };
  if (!b.upcoming) return { text: "Completed", className: "bg-slate-100 text-slate-600" };
  return { text: "Confirmed", className: "bg-emerald-50 text-emerald-700" };
}

export default function MyBookingsPage() {
  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = (token: string) => {
    setBusy(true);
    fetch("/api/my-bookings", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          sessionStorage.removeItem(TOKEN_KEY);
          setStep("contact");
          return;
        }
        setBookings(data.bookings ?? []);
        setStep("list");
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) loadBookings(token);
  }, []);

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    fetch("/api/my-bookings/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data?.error ?? "Something went wrong.");
          return;
        }
        setChannel(data.channel === "phone" ? "phone" : "email");
        setCode("");
        setStep("code");
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setBusy(false));
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    fetch("/api/my-bookings/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact, code }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.token) {
          setError(data?.error ?? "That code isn't right.");
          setBusy(false);
          return;
        }
        sessionStorage.setItem(TOKEN_KEY, data.token);
        loadBookings(data.token);
      })
      .catch(() => {
        setError("Could not connect. Please try again.");
        setBusy(false);
      });
  };

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setBookings([]);
    setContact("");
    setStep("contact");
  };

  const upcoming = bookings.filter((b) => b.upcoming).sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  );
  const past = bookings.filter((b) => !b.upcoming);

  const renderBooking = (b: PortalBooking) => {
    const status = statusLabel(b);
    return (
      <div key={b.id} className="lux-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[1.4rem] text-white">{b.serviceName}</p>
            <p className="text-sm text-slate-600 mt-0.5">
              {formatBookingDate(b.date, "EEE d MMM yyyy")} · {b.startTime}–{b.endTime} · with{" "}
              {b.technicianName}
            </p>
          </div>
          <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${status.className}`}>
            {status.text}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {b.manageUrl && (
            <a
              href={b.manageUrl}
              className="lux-pill hover:bg-white/5"
            >
              Change or cancel
            </a>
          )}
          {b.payDepositUrl && (
            <Link
              href={b.payDepositUrl}
              className="lux-btn"
            >
              Pay deposit
            </Link>
          )}
          {b.upcoming && b.status === "confirmed" && (
            <Link
              href={`/booking/${b.id}#calendar`}
              className="lux-pill hover:bg-white/5"
            >
              Details &amp; calendar
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
      <HomeBackLinks />
      <h1 className="font-serif text-[2.4rem] sm:text-[2.875rem] font-normal text-white leading-tight mb-3">My Bookings</h1>

      {step === "contact" && (
        <form onSubmit={sendCode} className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Enter the email address or mobile number you booked with. We&apos;ll send you a one-time
            code to view your appointments.
          </p>
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com or 07xxx xxxxxx"
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy || !contact.trim()} className={primaryButton}>
            {busy ? "Sending…" : "Send my code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            If we have bookings for <strong>{contact.trim()}</strong>, we&apos;ve just sent a 6-digit
            code by {channel === "phone" ? "text" : "email"}. It expires in 10 minutes.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="------"
            aria-label="6-digit code"
            className={`${inputClass} tracking-[0.6em] text-center text-lg placeholder:text-slate-300`}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6} className={primaryButton}>
            {busy ? "Checking…" : "View my bookings"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => setStep("contact")} className="text-slate-500 hover:text-slate-700">
              ← Use a different email or number
            </button>
            <button type="button" onClick={() => sendCode()} disabled={busy} className="text-navy hover:underline">
              Send a new code
            </button>
          </div>
        </form>
      )}

      {step === "list" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">You have no upcoming appointments.</p>
            ) : (
              upcoming.map(renderBooking)
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">Past &amp; cancelled</h2>
              {past.map(renderBooking)}
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href="/book"
              className="lux-btn"
            >
              Book another appointment
            </Link>
            <button type="button" onClick={signOut} className="text-sm text-slate-500 hover:text-slate-700">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
