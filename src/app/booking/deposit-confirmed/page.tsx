"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BookingCalendarButtons from "@/components/BookingCalendarButtons";
import { formatBookingDate } from "@/lib/format";

type ConfirmedBooking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string };
  technician?: { name: string } | null;
};

export default function DepositConfirmedPage() {
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [businessName, setBusinessName] = useState("Be Beauty Bar");
  const [businessAddress, setBusinessAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId")?.trim();
    const sessionId = params.get("session_id")?.trim();
    if (!bookingId) return;

    const confirm = sessionId
      ? fetch(
          `/api/confirm-deposit?bookingId=${encodeURIComponent(bookingId)}&session_id=${encodeURIComponent(sessionId)}`
        ).catch(() => {})
      : Promise.resolve();

    confirm
      .then(() =>
        Promise.all([
          fetch(`/api/bookings?id=${encodeURIComponent(bookingId)}`).then((r) => (r.ok ? r.json() : null)),
          fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
        ])
      )
      .then(([bookingRes, settingsRes]) => {
        if (bookingRes?.id && bookingRes.status !== "cancelled") setBooking(bookingRes);
        if (settingsRes?.businessName) setBusinessName(settingsRes.businessName);
        if (settingsRes?.businessAddress) setBusinessAddress(settingsRes.businessAddress);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600" aria-hidden>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-light text-slate-800">
          Deposit payment confirmed
        </h1>
        <p className="text-slate-600">
          Your booking is secured. We&apos;ll send you a confirmation by email and, if you chose it, by text.
        </p>

        {booking && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm">
            <p className="font-serif text-lg text-slate-800">{booking.service.name}</p>
            <p className="text-sm text-slate-600 mt-1">
              {formatBookingDate(booking.date, "EEEE, dd/MM/yyyy")} · {booking.startTime}–{booking.endTime}
              {booking.technician?.name && <> · with {booking.technician.name}</>}
            </p>
            <BookingCalendarButtons
              booking={booking}
              businessName={businessName}
              businessAddress={businessAddress}
              className="mt-4"
            />
            <Link
              href={`/booking/${booking.id}`}
              className="inline-block mt-4 text-sm text-navy hover:underline"
            >
              View booking details →
            </Link>
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/book"
            className="inline-block w-full sm:w-auto px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            Book another appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
