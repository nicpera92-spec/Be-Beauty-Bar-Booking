"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate, formatCurrency } from "@/lib/format";

type State =
  | "loading"
  | "invalid"
  | "refundable"
  | "non_refundable"
  | "already_cancelled"
  | "appointment_passed"
  | "not_confirmed"
  | "cancelled";

type BookingSummary = {
  customerName: string;
  serviceName: string;
  technicianName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  depositAmount: number;
};

export default function CancelBookingPage() {
  const params = useParams();
  const id = params.id as string;
  const sig = params.sig as string;
  const [state, setState] = useState<State>("loading");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [refundHours, setRefundHours] = useState(48);
  const [businessName, setBusinessName] = useState("Be Beauty Bar");
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null);
  const [refundDetails, setRefundDetails] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/${encodeURIComponent(id)}/cancel?s=${encodeURIComponent(sig)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.booking) setBooking(data.booking);
        if (data?.refundHours) setRefundHours(data.refundHours);
        if (data?.businessName) setBusinessName(data.businessName);
        if (data?.instagramHandle) setInstagramHandle(data.instagramHandle);
        setState((data?.state as State) ?? "invalid");
      })
      .catch(() => setState("invalid"));
  }, [id, sig]);

  const cancelBooking = () => {
    setError(null);
    setCancelling(true);
    fetch(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s: sig }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.state === "cancelled") {
          setRefundDetails(data.refundDetails ?? null);
          setState("cancelled");
        } else if (data?.state) {
          setState(data.state as State);
        } else {
          setError("Something went wrong. Please try again.");
        }
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setCancelling(false));
  };

  const instagram = instagramHandle?.replace(/^@/, "");
  const deposit = booking ? formatCurrency(booking.depositAmount) : "";
  const hasDeposit = (booking?.depositAmount ?? 0) > 0;

  const bookingCard = booking && (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <h2 className="font-serif text-xl md:text-2xl font-light text-slate-800 mb-2">
        {booking.serviceName}
      </h2>
      <p className="text-slate-600 text-sm">
        {formatBookingDate(booking.date, "EEEE, dd/MM/yyyy")} · {booking.startTime}–{booking.endTime}
        {booking.technicianName && <> · with {booking.technicianName}</>}
      </p>
      {hasDeposit && (
        <p className="text-slate-500 text-sm mt-2">{deposit} deposit paid</p>
      )}
    </div>
  );

  const contactLine = (
    <p className="text-sm text-slate-500 leading-relaxed">
      Any questions? DM us on Instagram
      {instagram ? (
        <>
          {" "}
          <a
            href={`https://instagram.com/${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy hover:underline"
          >
            @{instagram}
          </a>
          .
        </>
      ) : (
        "."
      )}
    </p>
  );

  const bookAgainLink = (
    <div className="pt-2 text-center">
      <Link
        href="/"
        className="inline-flex items-center justify-center px-8 py-3 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition min-h-[48px]"
      >
        Book another appointment
      </Link>
    </div>
  );

  if (state === "loading") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-500">Loading your booking…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28 space-y-8">
      {(state === "refundable" || state === "non_refundable") && booking && (
        <>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
              Cancel your booking
            </h1>
            <p className="text-slate-600 text-sm">
              Hi {booking.customerName}, you&apos;re about to cancel the booking below.
            </p>
          </div>

          {bookingCard}

          {state === "refundable" ? (
            <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-800">
                {hasDeposit ? "Your deposit will be refunded" : "No deposit to refund"}
              </p>
              <p className="text-sm text-emerald-900/80 leading-relaxed">
                {hasDeposit
                  ? `You're cancelling more than ${refundHours} hours before your appointment, so your ${deposit} deposit will be refunded in full to your original payment method.`
                  : "No deposit was taken for this booking."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-4 space-y-2">
              <p className="text-sm font-bold text-red-700 uppercase tracking-wide">
                Cancellation policy reminder
              </p>
              <p className="text-sm text-red-900 leading-relaxed">
                Your appointment is less than {refundHours} hours away. Under our cancellation
                policy, deposits are <strong>non-refundable</strong> for cancellations made within{" "}
                {refundHours} hours of the appointment.
              </p>
              {hasDeposit && (
                <p className="text-sm text-red-900 leading-relaxed">
                  You can still cancel, but your {deposit} deposit will not be refunded.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">
            Please note: each booking can only be cancelled once, and a cancelled booking can&apos;t be
            restored. To come back, simply make a new booking.
          </p>

          {error && (
            <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={cancelBooking}
            disabled={cancelling}
            className="w-full bg-red-600 text-white py-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition touch-manipulation min-h-[52px] shadow-sm"
          >
            {cancelling
              ? "Cancelling…"
              : state === "non_refundable" && hasDeposit
                ? "Cancel anyway – I understand my deposit is non-refundable"
                : "Cancel my booking"}
          </button>

          <p className="text-sm text-slate-600 text-center">
            Changed your mind? You don&apos;t need to do anything — your booking stays as it is.
          </p>

          {contactLine}
          {bookAgainLink}
        </>
      )}

      {state === "cancelled" && (
        <div className="text-center space-y-5">
          <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800">
            Your booking has been cancelled
          </h1>
          {refundDetails && (
            <p className="text-sm text-slate-700 leading-relaxed">{refundDetails}</p>
          )}
          <p className="text-sm text-slate-600 leading-relaxed">
            We&apos;re sorry we won&apos;t see you this time and hope to see you again soon at{" "}
            {businessName}.
          </p>
          {bookAgainLink}
        </div>
      )}

      {state === "already_cancelled" && (
        <div className="text-center space-y-5">
          <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800">
            This booking has already been cancelled
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            You&apos;ve already cancelled this booking, so this link can&apos;t be used again. We
            hope to see you again soon at {businessName}!
          </p>
          {contactLine}
          {bookAgainLink}
        </div>
      )}

      {state === "appointment_passed" && (
        <div className="text-center space-y-5">
          <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800">
            This appointment has already passed
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The time for this booking has passed, so it can no longer be cancelled online.
          </p>
          {contactLine}
          {bookAgainLink}
        </div>
      )}

      {(state === "not_confirmed" || state === "invalid") && (
        <div className="text-center space-y-5">
          <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800">
            This link isn&apos;t valid
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            We couldn&apos;t find a booking that can be cancelled with this link. Please check you
            used the full link from your confirmation email or text.
          </p>
          {contactLine}
          {bookAgainLink}
        </div>
      )}
    </div>
  );
}
