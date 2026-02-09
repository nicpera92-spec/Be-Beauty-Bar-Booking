"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, parse } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type Booking = {
  id: string;
  service: { name: string; durationMin: number };
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  servicePrice: number;
  depositAmount: number;
  balancePaidOnline: boolean;
  status: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
};

type Settings = {
  businessName: string;
  instagramHandle?: string | null;
  smsNotificationFee?: number | null;
};

export default function BookingPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingBalance, setPayingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [paidParam, setPaidParam] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/bookings?id=${id}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([bookingRes, settingsRes]) => {
        setBooking(bookingRes?.id ? bookingRes : null);
        setSettings(settingsRes?.businessName != null ? settingsRes : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const paid = new URLSearchParams(window.location.search).get("paid") === "1";
      setPaidParam(paid);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!paidParam || !booking || !settings) return;
    const smsFee = settings.smsNotificationFee ?? 0.05;
    const baseDeposit = booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
    const noRemaining = (booking.servicePrice - baseDeposit) <= 0.001;
    const done = booking.status === "confirmed" && (noRemaining || booking.balancePaidOnline);
    if (done) return;
    const t = setTimeout(fetchData, 2000);
    return () => clearTimeout(t);
  }, [paidParam, booking?.status, booking?.balancePaidOnline, booking?.servicePrice, booking?.depositAmount, booking?.notifyBySMS, settings, fetchData]);

  const payByCard = async () => {
    setPayError(null);
    setPaying(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, type: "deposit" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data?.error ?? "Could not start payment. Please try again.");
        setPaying(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setPayError("Something went wrong. Please try again.");
    } catch {
      setPayError("Could not connect. Please try again.");
    }
    setPaying(false);
  };

  const payBalance = async () => {
    if (!booking || !settings) return;
    const smsFee = settings.smsNotificationFee ?? 0.05;
    const baseDeposit = booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
    const rem = booking.servicePrice - baseDeposit;
    if (rem <= 0) return;
    setBalanceError(null);
    setPayingBalance(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, type: "balance" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBalanceError(data?.error ?? "Could not start payment.");
        setPayingBalance(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setBalanceError("Something went wrong.");
    } catch {
      setBalanceError("Could not connect.");
    }
    setPayingBalance(false);
  };

  const justPaidWaitingConfirmation = paidParam && booking?.status === "pending_deposit";

  if (loading || justPaidWaitingConfirmation) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-500">
          {paidParam || justPaidWaitingConfirmation ? "Confirming your payment…" : "Loading your booking…"}
        </p>
        {(paidParam || justPaidWaitingConfirmation) && (
          <p className="text-slate-400 text-sm mt-2">This usually takes a few seconds.</p>
        )}
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-600 mb-6">Booking not found.</p>
        <Link href="/book" className="text-navy hover:underline">
          Book an appointment
        </Link>
      </div>
    );
  }

  const dayLabel = (() => {
    try {
      const d = parse(booking.date, "yyyy-MM-dd", new Date());
      return format(d, "EEEE, dd/MM/yyyy");
    } catch {
      return booking.date;
    }
  })();

  const businessName = settings?.businessName ?? "Be Beauty Bar";
  const confirmed = booking.status === "confirmed";
  const pending = booking.status === "pending_deposit";
  
  // Calculate remaining balance (service price - base deposit, excluding SMS fee)
  const smsFee = settings?.smsNotificationFee ?? 0.05;
  const baseDeposit = booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
  const remaining = booking.servicePrice - baseDeposit;
  const hasRemaining = remaining > 0.001;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <Link
        href="/"
        className="text-sm text-navy hover:underline mb-8 inline-block"
      >
        Home
      </Link>
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 shadow-sm">
        <div
          className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-8 ${
            confirmed
              ? "bg-slate-100 text-navy"
              : pending
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {confirmed ? "Confirmed" : pending ? "Awaiting deposit" : booking.status}
        </div>

        <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
          {booking.service.name}
        </h1>
        <p className="text-slate-600 mb-5">
          {dayLabel} · {booking.startTime}–{booking.endTime}
        </p>
        <p className="text-sm text-slate-600 mb-3">
          {booking.customerName} · {booking.customerEmail}
        </p>
        <p className="text-sm text-slate-500">
          {formatCurrency(booking.servicePrice)} total · {formatCurrency(booking.depositAmount)} deposit
          {hasRemaining && (
            <> · {formatCurrency(remaining)} remaining</>
          )}
        </p>
      </div>

      {pending && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 shadow-sm space-y-8">
          <h2 className="font-serif text-xl font-light text-slate-800">
            Pay your deposit ({formatCurrency(booking.depositAmount)}) to confirm
          </h2>

          <div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed font-semibold">
              Please ensure deposit is paid within 24 hours of booking. If the deposit is not paid within 24 hours, your booking slot will be automatically cancelled.
            </p>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Pay by card below. Your booking is confirmed as soon as payment
              succeeds, and you’ll receive a confirmation email.
            </p>
            <button
              type="button"
              onClick={payByCard}
              disabled={paying}
              className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition touch-manipulation min-h-[52px] shadow-sm"
            >
              {paying ? "Redirecting to payment…" : "Pay " + formatCurrency(booking.depositAmount) + " by card"}
            </button>
            {payError && (
              <p className="mt-3 text-sm text-slate-600">{payError}</p>
            )}
            <p className="text-sm text-slate-500 mt-5 leading-relaxed">
              For any questions or issues, DM us on Instagram
              {settings?.instagramHandle ? (
                <>
                  {" "}
                  <a
                    href={`https://instagram.com/${settings.instagramHandle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-navy hover:underline"
                  >
                    @{settings.instagramHandle.replace(/^@/, "")}
                  </a>
                  .
                </>
              ) : (
                "."
              )}
            </p>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 md:p-10 shadow-sm space-y-8">
          <div>
            <h2 className="font-serif text-xl font-light text-slate-800 mb-3">Your booking is confirmed</h2>
            <p className="text-slate-600 text-sm mb-3 leading-relaxed">
              Your deposit has been received.
              {booking.customerEmail && (
                <> A confirmation email has been sent to{" "}
                <strong className="text-slate-800">{booking.customerEmail}</strong>.</>
              )}
              {booking.notifyBySMS && booking.customerPhone && (
                <> A confirmation SMS has been sent to your phone.</>
              )}
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              {businessName} has also received a confirmation. We look forward to seeing
              you!
            </p>
          </div>

          {hasRemaining && !booking.balancePaidOnline && (
            <div className="border-t border-slate-200 pt-8">
              <p className="text-sm font-medium text-slate-800 mb-3">
                Remaining {formatCurrency(remaining)} (full price − deposit)
              </p>
              <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                You can pay the remaining balance now online, or pay in person when you
                arrive. The deposit is already deducted.
              </p>
              <button
                type="button"
                onClick={payBalance}
                disabled={payingBalance}
                className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition touch-manipulation min-h-[52px] shadow-sm"
              >
                {payingBalance ? "Redirecting…" : "Pay " + formatCurrency(remaining) + " remaining now"}
              </button>
              {balanceError && (
                <p className="mt-3 text-sm text-slate-600">{balanceError}</p>
              )}
              <p className="text-sm text-slate-500 mt-4">
                Or pay {formatCurrency(remaining)} in person.
              </p>
            </div>
          )}

          {hasRemaining && booking.balancePaidOnline && (
            <p className="text-sm text-navy font-medium border-t border-slate-200 pt-8">
              Fully paid — remaining balance received. See you soon!
            </p>
          )}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link href="/book" className="text-navy hover:underline text-sm">
          Book another appointment
        </Link>
      </div>
    </div>
  );
}
