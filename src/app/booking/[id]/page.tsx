"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format, parse } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import BookingCalendarButtons from "@/components/BookingCalendarButtons";
import { HomeBackLinks } from "@/components/PageTopLinks";

type Booking = {
  id: string;
  service: { name: string; durationMin: number; requiresDeposit?: boolean };
  technician?: { name: string } | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  servicePrice: number;
  depositAmount: number;
  voucherAmount?: number;
  certificateItemId?: string | null;
  balancePaidOnline: boolean;
  status: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
};

type Settings = {
  businessName: string;
  instagramHandle?: string | null;
  smsNotificationFee?: number | null;
  cancellationRefundHours?: number;
  businessAddress?: string | null;
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
      const params = new URLSearchParams(window.location.search);
      setPaidParam(params.get("paid") === "1");
      const sessionId = params.get("session_id")?.trim();
      if (sessionId && id) {
        fetch(`/api/confirm-deposit?bookingId=${encodeURIComponent(id)}&session_id=${encodeURIComponent(sessionId)}`)
          .then(() => fetchData())
          .catch(() => {});
      }
    }
  }, [id]);

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
        <HomeBackLinks className="mb-6" />
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
        <HomeBackLinks className="mb-6" />
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
  const noDeposit = booking.service.requiresDeposit === false;
  const paidByCertificate = Boolean(booking.certificateItemId);

  // Calculate remaining balance (service price - base deposit, excluding SMS fee)
  const smsFee = settings?.smsNotificationFee ?? 0.05;
  const baseDeposit = noDeposit
    ? 0
    : booking.depositAmount - (booking.notifyBySMS ? smsFee : 0);
  const remaining = booking.servicePrice - baseDeposit;
  const hasRemaining = !paidByCertificate && remaining > 0.001;
  const depositDueByCard = booking.depositAmount - (booking.voucherAmount ?? 0);

  return (
    <div className="max-w-[640px] mx-auto w-full px-6 pt-14 pb-20">
      <HomeBackLinks className="mb-12" />

      <div className="text-center mb-9">
        {confirmed && (
          <div
            className="mx-auto mb-6 w-[72px] h-[72px] rounded-full flex items-center justify-center border border-[rgba(120,160,230,0.6)] text-[28px] text-white shadow-[0_0_40px_-6px_rgba(70,120,220,0.7)]"
            aria-hidden
          >
            ✓
          </div>
        )}
        <p className={`lux-eyebrow ${pending ? "!text-amber-300" : ""}`}>
          {confirmed ? "Confirmed" : pending ? "Awaiting deposit" : booking.status}
        </p>
        <h1 className="font-serif text-[2.6rem] sm:text-5xl font-normal text-white leading-tight mt-2">
          {confirmed ? `See you soon, ${booking.customerName.trim().split(/\s+/)[0]}` : booking.service.name}
        </h1>
      </div>

      <div className="lux-card">
        <p className="font-serif text-[1.65rem] leading-snug text-white mb-2">{booking.service.name}</p>
        {[
          { label: "When", value: `${dayLabel} · ${booking.startTime}–${booking.endTime}` },
          ...(booking.technician?.name ? [{ label: "With", value: booking.technician.name }] : []),
          {
            label: "Booked for",
            value: booking.customerEmail ? `${booking.customerName} · ${booking.customerEmail}` : booking.customerName,
          },
          { label: "Total", value: formatCurrency(booking.servicePrice) },
          {
            label: paidByCertificate ? "Payment" : noDeposit ? "Deposit" : confirmed ? "Deposit paid" : "Deposit",
            value: paidByCertificate
              ? "Paid in full by gift certificate"
              : noDeposit
                ? "No deposit required"
                : `${formatCurrency(booking.depositAmount)}${
                    (booking.voucherAmount ?? 0) > 0 ? ` (${formatCurrency(booking.voucherAmount!)} by gift voucher)` : ""
                  }`,
          },
          ...(hasRemaining
            ? [
                {
                  label: booking.balancePaidOnline ? "Balance" : "To pay at the salon",
                  value: booking.balancePaidOnline ? "Paid online" : formatCurrency(remaining),
                },
              ]
            : []),
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-4 py-3 border-b border-white/5 last:border-0 text-sm"
          >
            <span className="lux-muted shrink-0">{row.label}</span>
            <span className="text-right text-white">{row.value}</span>
          </div>
        ))}
      </div>

      {pending && (
        <div className="mt-6 lux-card space-y-6">
          <h2 className="font-serif text-2xl font-normal text-white">
            Pay your deposit ({formatCurrency(depositDueByCard)}) to confirm
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
              className="lux-btn w-full"
            >
              {paying ? "Redirecting to payment…" : "Pay " + formatCurrency(depositDueByCard) + " by card"}
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
        <div className="mt-6 space-y-8">
          <div>
            <p className="lux-muted text-sm mb-3 leading-relaxed text-center">
              {paidByCertificate
                ? "Your gift certificate covers this treatment in full — there's nothing to pay at the salon."
                : !noDeposit && "Your deposit has been received."}
              {booking.customerEmail && (
                <> A confirmation email has been sent to{" "}
                <strong className="text-slate-800">{booking.customerEmail}</strong>.</>
              )}
              {booking.notifyBySMS && booking.customerPhone && (
                <> A confirmation SMS has been sent to your phone.</>
              )}
            </p>
            <p className="text-slate-500 text-sm leading-relaxed text-center">
              {businessName} has also received a confirmation. We look forward to seeing
              you!
            </p>
            <BookingCalendarButtons
              booking={booking}
              businessName={businessName}
              businessAddress={settings?.businessAddress}
              className="mt-6"
            />
            <p className="text-slate-500 text-sm leading-relaxed mt-4 text-center">
              {paidByCertificate ? (
                <>
                  Need to cancel? Use the link in your confirmation email or text — the treatment goes
                  back on your gift certificate so you can book again.
                </>
              ) : (
                <>
                  Need to cancel? Use the link in your confirmation email or text. Deposits are
                  refunded for cancellations made more than {settings?.cancellationRefundHours ?? 48}{" "}
                  hours before your appointment.
                </>
              )}
            </p>
          </div>

          {hasRemaining && !booking.balancePaidOnline && (
            <div className="border-t border-slate-200 pt-8">
              <p className="text-sm font-medium text-slate-800 mb-3">
                {noDeposit
                  ? `Amount due ${formatCurrency(remaining)}`
                  : `Remaining ${formatCurrency(remaining)} (full price − deposit)`}
              </p>
              <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                You can pay {noDeposit ? "the full amount" : "the remaining balance"} now
                online, or pay in person when you arrive.
                {!noDeposit && " The deposit is already deducted."}
              </p>
              <button
                type="button"
                onClick={payBalance}
                disabled={payingBalance}
                className="lux-btn w-full"
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
