"use client";

import { useState } from "react";
import Link from "next/link";
import NumberField from "@/components/NumberField";
import PageTopLinks from "@/components/PageTopLinks";
import {
  VOUCHER_MAX_AMOUNT,
  VOUCHER_MIN_AMOUNT,
  VOUCHER_PRESET_AMOUNTS,
  VOUCHER_VALID_MONTHS,
  isValidVoucherAmount,
} from "@/lib/giftVoucherRules";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none text-base min-h-[48px]";
const labelClass = "block text-sm font-medium text-slate-700 mb-2";

export default function GiftVouchersPage() {
  const [amount, setAmount] = useState<number>(50);
  const [custom, setCustom] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidVoucherAmount(amount)) {
      setError(`Please choose a whole-pound amount between £${VOUCHER_MIN_AMOUNT} and £${VOUCHER_MAX_AMOUNT}.`);
      return;
    }
    setSubmitting(true);
    fetch("/api/vouchers/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, recipientName, recipientEmail, message, purchaserName, purchaserEmail }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.url) {
          window.location.href = data.url;
          return;
        }
        setError(data?.error ?? "Could not start payment. Please try again.");
        setSubmitting(false);
      })
      .catch(() => {
        setError("Could not connect. Please try again.");
        setSubmitting(false);
      });
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
      <PageTopLinks>
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
      </PageTopLinks>
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">Gift Vouchers</h1>
      <p className="text-sm text-slate-600 leading-relaxed mb-8">
        Treat someone to nails, lashes or permanent makeup. The voucher code is emailed straight away
        and is valid for {VOUCHER_VALID_MONTHS} months — it pays the deposit when booking online, and any
        remaining value can be used at the salon.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <p className={labelClass}>Amount</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {VOUCHER_PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCustom(false);
                  setAmount(preset);
                }}
                className={`py-3 rounded-lg border text-sm font-medium min-h-[48px] transition ${
                  !custom && amount === preset
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                £{preset}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustom(true)}
              className={`py-3 rounded-lg border text-sm font-medium min-h-[48px] transition ${
                custom ? "bg-navy text-white border-navy" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              Other
            </button>
          </div>
          {custom && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-slate-600">£</span>
              <NumberField
                integer
                min={VOUCHER_MIN_AMOUNT}
                max={VOUCHER_MAX_AMOUNT}
                value={amount}
                onValueChange={setAmount}
                className={`${inputClass} max-w-[140px]`}
              />
              <span className="text-xs text-slate-500">
                £{VOUCHER_MIN_AMOUNT}–£{VOUCHER_MAX_AMOUNT}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          <p className="text-sm font-medium text-slate-700">Who is it for?</p>
          <div>
            <label htmlFor="recipient-name" className={labelClass}>
              Their name
            </label>
            <input
              id="recipient-name"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Sophie"
            />
          </div>
          <div>
            <label htmlFor="recipient-email" className={labelClass}>
              Their email <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className={inputClass}
              placeholder="Leave blank to send it to yourself"
            />
          </div>
          <div>
            <label htmlFor="message" className={labelClass}>
              Message <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="message"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Happy birthday! Enjoy some pampering x"
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">Your details</p>
          <input
            type="text"
            required
            value={purchaserName}
            onChange={(e) => setPurchaserName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
          <input
            type="email"
            required
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
            className={inputClass}
            placeholder="Your email (for the receipt and code)"
          />
        </div>

        {error && (
          <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition min-h-[52px] shadow-sm"
        >
          {submitting ? "Redirecting to payment…" : `Buy £${amount || "…"} gift voucher`}
        </button>
      </form>
    </div>
  );
}
