"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate } from "@/lib/format";

type Confirmed = {
  code: string;
  amount: number;
  recipientName: string | null;
  recipientEmail: string | null;
  purchaserEmail: string;
  expiresAt: string | null;
};

export default function GiftVoucherSuccessPage() {
  const [voucher, setVoucher] = useState<Confirmed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setError("We couldn't find your payment.");
      return;
    }
    fetch(`/api/vouchers/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setVoucher(data);
        else setError("We're still confirming your payment — your voucher will be emailed to you shortly.");
      })
      .catch(() => setError("We're still confirming your payment — your voucher will be emailed to you shortly."));
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {!voucher && !error && <p className="text-slate-500">Confirming your payment…</p>}

        {error && (
          <>
            <h1 className="font-serif text-2xl font-light text-slate-800">Thank you!</h1>
            <p className="text-slate-600">{error}</p>
          </>
        )}

        {voucher && (
          <>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-slate-800">
              Your £{voucher.amount} gift voucher is ready
            </h1>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Voucher code</p>
              <p className="text-2xl font-bold tracking-widest text-navy">{voucher.code}</p>
              {voucher.expiresAt && (
                <p className="text-xs text-slate-500 mt-2">
                  Valid until {formatBookingDate(voucher.expiresAt.slice(0, 10), "d MMMM yyyy")}
                </p>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              We&apos;ve emailed the code to <strong>{voucher.purchaserEmail}</strong>
              {voucher.recipientEmail && (
                <>
                  {" "}and to {voucher.recipientName ?? "the recipient"} at{" "}
                  <strong>{voucher.recipientEmail}</strong>
                </>
              )}
              .
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-navy text-white font-medium hover:bg-navy-light transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
