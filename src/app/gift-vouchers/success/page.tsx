"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate } from "@/lib/format";

type Confirmed = {
  code: string;
  amount: number;
  packageName: string | null;
  treatments: string[];
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
        else setError("We're still confirming your payment — the gift certificate will be emailed shortly.");
      })
      .catch(() => setError("We're still confirming your payment — the gift certificate will be emailed shortly."));
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
              {voucher.recipientName
                ? `${voucher.recipientName}'s gift certificate is ready`
                : "Your gift certificate is ready"}
            </h1>
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6">
              {voucher.treatments.length > 0 && (
                <div className="mb-4 text-sm text-slate-700 space-y-0.5">
                  {voucher.packageName && <p className="font-medium">{voucher.packageName}</p>}
                  {voucher.treatments.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                  <p className="text-xs text-slate-500 pt-1">Paid in full — nothing to pay at the appointment</p>
                </div>
              )}
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Certificate code</p>
              <p className="text-2xl font-bold tracking-widest text-navy">{voucher.code}</p>
              {voucher.expiresAt && (
                <p className="text-xs text-slate-500 mt-2">
                  Valid until {formatBookingDate(voucher.expiresAt.slice(0, 10), "d MMMM yyyy")}
                </p>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {voucher.recipientEmail ? (
                <>
                  We&apos;ve emailed it, with your message, to {voucher.recipientName ?? "them"} at{" "}
                  <strong>{voucher.recipientEmail}</strong>, and sent your receipt to{" "}
                  <strong>{voucher.purchaserEmail}</strong>.
                </>
              ) : (
                <>
                  We&apos;ve emailed the gift certificate, with your message, to{" "}
                  <strong>{voucher.purchaserEmail}</strong> so you can print or forward it.
                </>
              )}
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
