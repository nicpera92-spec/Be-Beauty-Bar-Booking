"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate, formatCurrency } from "@/lib/format";
import CancellationPolicyList from "@/components/CancellationPolicyList";
import PageTopLinks from "@/components/PageTopLinks";
import { DEFAULT_CANCELLATION_REFUND_HOURS } from "@/lib/cancellationPolicy";
import { voucherDepositSplit } from "@/lib/giftVoucherRules";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  depositAmount: number;
  requiresDeposit: boolean;
};

type Slot = { start: string; end: string };

export default function BookFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const waitlistToken = searchParams.get("wl");
  const technicianId = params.technicianId as string;
  const serviceId = params.serviceId as string;
  const date = params.date as string;
  const startTime = decodeURIComponent(params.slot as string);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsFee, setSmsFee] = useState<number>(0.05);
  const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null);
  const [refundHours, setRefundHours] = useState(DEFAULT_CANCELLATION_REFUND_HOURS);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [notifyBySMS, setNotifyBySMS] = useState(true);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<
    { kind: "credit"; code: string; balance: number } | { kind: "certificate"; code: string; covers: string } | null
  >(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  const datePageHref = `/book/tech/${technicianId}/${serviceId}${
    waitlistToken ? `?wl=${encodeURIComponent(waitlistToken)}&date=${encodeURIComponent(date)}` : ""
  }`;

  const fetchData = useCallback(() => {
    setLoading(true);
    const wlParam = waitlistToken ? `&wl=${encodeURIComponent(waitlistToken)}` : "";
    Promise.all([
      fetch(`/api/services?technicianId=${encodeURIComponent(technicianId)}&_=${Date.now()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/slots?date=${date}&serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}${wlParam}`
      ).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([servicesRes, slotsRes, settingsRes]) => {
        const list = Array.isArray(servicesRes) ? servicesRes : [];
        const s = list.find((x: { id: string }) => x.id === serviceId);
        setService(s ?? null);
        setSlots(slotsRes.slots ?? []);
        setSmsFee(settingsRes?.smsNotificationFee ?? 0.05);
        setCancellationPolicy(settingsRes?.cancellationPolicy ?? null);
        setRefundHours(settingsRes?.cancellationRefundHours ?? DEFAULT_CANCELLATION_REFUND_HOURS);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, serviceId, technicianId, waitlistToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const slot = slots.find((s) => s.start === startTime);
  const endTime = slot?.end ?? "";

  const requiresDeposit = service?.requiresDeposit ?? true;
  const totalPrice = service?.price ?? 0;
  const totalDeposit = requiresDeposit
    ? (service?.depositAmount ?? 0) + (notifyBySMS ? smsFee : 0)
    : 0;

  const certificate = voucher?.kind === "certificate" ? voucher : null;
  const creditVoucher = voucher?.kind === "credit" ? voucher : null;
  const voucherSplit =
    creditVoucher && requiresDeposit ? voucherDepositSplit(totalDeposit, creditVoucher.balance) : null;
  const coveredByVoucher = Boolean(voucherSplit && voucherSplit.voucher > 0 && voucherSplit.card <= 0);

  const applyVoucher = () => {
    setVoucherError(null);
    setCheckingVoucher(true);
    fetch(
      `/api/vouchers/check?code=${encodeURIComponent(voucherInput)}&serviceId=${encodeURIComponent(serviceId)}`
    )
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.kind === "certificate") {
          setVoucher({ kind: "certificate", code: data.code, covers: data.covers ?? service?.name ?? "" });
        } else if (ok && !requiresDeposit) {
          setVoucher(null);
          setVoucherError(
            "This is a credit voucher, which pays deposits online. This treatment has no deposit, so please show your code at the salon instead."
          );
        } else if (ok) {
          setVoucher({ kind: "credit", code: data.code, balance: data.balance });
        } else {
          setVoucher(null);
          setVoucherError(data?.error ?? "We couldn't find that gift certificate code.");
        }
      })
      .catch(() => setVoucherError("Could not check the code. Please try again."))
      .finally(() => setCheckingVoucher(false));
  };

  const dayLabel = formatBookingDate(date, "EEEE, dd/MM/yyyy");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptedPolicy) {
      setPolicyError(true);
      return;
    }
    setPolicyError(false);

    if (!email.trim() && !phone.trim()) {
      setError("Please provide either an email address or phone number (or both).");
      return;
    }
    if (!notifyByEmail && !notifyBySMS) {
      setError("Please select at least one notification method (email or SMS).");
      return;
    }
    if (notifyByEmail && !email.trim()) {
      setError("Email address is required if you want email notifications.");
      return;
    }
    if (notifyBySMS && !phone.trim()) {
      setError("Phone number is required if you want SMS notifications.");
      return;
    }

    setSubmitting(true);

    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        technicianId,
        customerName: name,
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        date,
        startTime,
        endTime,
        notes: notes || undefined,
        notifyByEmail,
        notifyBySMS,
        ...(waitlistToken ? { waitlistToken } : {}),
        ...(certificate ? { voucherCode: certificate.code } : {}),
        ...(creditVoucher && voucherSplit && voucherSplit.voucher > 0 ? { voucherCode: creditVoucher.code } : {}),
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d));
        return r.json();
      })
      .then((booking) => {
        router.push(`/booking/${booking.id}`);
      })
      .catch((err) => {
        setError(err?.error ?? "Booking failed. Please try again.");
        setSubmitting(false);
      });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!service || !slot) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-slate-600 mb-6">This time slot is no longer available.</p>
        <Link href={datePageHref} className="text-navy hover:underline">
          Choose another time
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto w-full px-6 pt-14 pb-20">
      <PageTopLinks className="mb-12">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        <Link href={datePageHref} className="text-sm text-navy hover:underline">
          ← Back to time slots
        </Link>
      </PageTopLinks>
      <h1 className="font-serif text-[2.4rem] sm:text-[2.6rem] font-normal text-white leading-tight mb-2">
        {service.name}
      </h1>
      <p className="lux-muted mb-10">
        {dayLabel} · {startTime}–{endTime} · {formatCurrency(totalPrice)} total
        {certificate ? (
          <> · <span className="text-[#dfe4ea]">Paid in full by gift certificate</span></>
        ) : requiresDeposit ? (
          <> · <span className="text-[#dfe4ea]">{formatCurrency(totalDeposit)} deposit</span></>
        ) : (
          <> · No deposit required</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label htmlFor="name" className="lux-label">
            Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lux-input"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="phone" className="lux-label">
            Phone {notifyBySMS && <span className="text-red-500">*</span>}
          </label>
          <input
            id="phone"
            type="tel"
            required={notifyBySMS}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="lux-input"
            placeholder="07xxx xxxxxx"
          />
        </div>
        <div>
          <label htmlFor="email" className="lux-label">
            Email {notifyByEmail && <span className="text-red-500">*</span>}
          </label>
          <input
            id="email"
            type="email"
            required={notifyByEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lux-input"
            placeholder="you@example.com"
          />
          <p className="text-xs lux-muted mt-2">Provide at least one: phone number or email</p>
        </div>

        <div>
          <p className="lux-label">
            How would you like to receive notifications? <span className="text-red-500">*</span>
          </p>
          <div className="lux-card !py-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBySMS}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked && !notifyByEmail) return;
                  setNotifyBySMS(checked);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              <div className="flex-1">
                <span className="text-[15px] text-white">Text message (SMS)</span>
                <p className="text-[13px] lux-muted mt-1">
                  {certificate
                    ? "Included with your gift certificate"
                    : `SMS notifications include a ${formatCurrency(smsFee)} charge`}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyByEmail}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked && !notifyBySMS) return;
                  setNotifyByEmail(checked);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              <div className="flex-1">
                <span className="text-[15px] text-white">Email</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="lux-label">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="lux-input resize-none min-h-[96px]"
            placeholder="Any special requests?"
          />
        </div>

        <div className={`lux-policy ${policyError ? "lux-policy-error" : ""}`}>
          <p className="lux-alert mb-4">
            <span aria-hidden="true">⚠</span>
            <span>Please read this cancellation policy carefully!</span>
          </p>
          <CancellationPolicyList
            policy={cancellationPolicy}
            refundHours={refundHours}
            className="text-sm lux-muted leading-[1.8] list-disc list-outside pl-5 ml-1 space-y-1 mb-2 [&_strong]:text-white [&_strong]:font-medium [&_b]:text-white"
          />
          <label className="flex items-start gap-3 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => {
                setAcceptedPolicy(e.target.checked);
                if (e.target.checked) setPolicyError(false);
              }}
              className="mt-0.5 w-4 h-4 rounded border border-slate-300 text-navy focus:ring-navy/20"
            />
            <span className="text-[15px] text-white">
              I confirm that I have read and agree to the cancellation policy.
            </span>
          </label>
        </div>

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg">
              {error}
            </p>
            <p>
              <Link href={datePageHref} className="text-sm text-navy hover:underline">
                Choose another time →
              </Link>
            </p>
          </div>
        )}

        <div className={!showVoucher && !voucher ? "" : "lux-card"}>
            {!showVoucher && !voucher ? (
              <button
                type="button"
                onClick={() => setShowVoucher(true)}
                className="lux-label !mb-0 hover:text-white transition"
              >
                Have a gift certificate?
              </button>
            ) : certificate ? (
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-slate-700">
                  <p className="font-medium text-emerald-700">Gift certificate {certificate.code} applied</p>
                  <p className="text-slate-600 mt-0.5">
                    Your {certificate.covers} is paid in full — nothing to pay now or at the salon.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoucher(null);
                    setVoucherInput("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : creditVoucher && voucherSplit ? (
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-slate-700">
                  <p className="font-medium text-emerald-700">Gift voucher {creditVoucher.code} applied</p>
                  <p className="text-slate-600 mt-0.5">
                    {voucherSplit.salon > 0 ? (
                      <>
                        Your {formatCurrency(voucherSplit.voucher)} voucher covers your deposit — the
                        remaining {formatCurrency(voucherSplit.salon)} is simply added to what you pay
                        at the salon.
                      </>
                    ) : (
                      <>
                        {formatCurrency(voucherSplit.voucher)} of your deposit is paid by the voucher
                        {voucherSplit.card > 0 && <> · {formatCurrency(voucherSplit.card)} left to pay by card</>}.
                        {creditVoucher.balance - voucherSplit.voucher > 0.001 && (
                          <> {formatCurrency(creditVoucher.balance - voucherSplit.voucher)} stays on the voucher to use at the salon.</>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoucher(null);
                    setVoucherInput("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="voucher" className="lux-label">
                  Gift certificate code
                </label>
                <div className="flex gap-2.5">
                  <input
                    id="voucher"
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="BB-ABCD-2345"
                    className="lux-input flex-1 min-w-0 uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyVoucher}
                    disabled={checkingVoucher || !voucherInput.trim()}
                    className="px-5 rounded-[14px] border border-white/15 text-[13px] tracking-[0.15em] uppercase text-[#dfe4ea] hover:bg-white/5 disabled:opacity-50 min-h-[52px]"
                  >
                    {checkingVoucher ? "Checking…" : "Apply"}
                  </button>
                </div>
                {voucherError && <p className="text-sm text-red-600">{voucherError}</p>}
              </div>
            )}
        </div>

        <p className="text-sm lux-muted leading-relaxed">
          {certificate ? (
            <>
              By submitting, your gift certificate pays for this treatment in full and your booking is
              confirmed straight away.
            </>
          ) : requiresDeposit && coveredByVoucher ? (
            <>
              By submitting, your gift voucher pays the{" "}
              {formatCurrency(voucherSplit?.voucher ?? totalDeposit)} deposit and your booking is
              confirmed straight away.
            </>
          ) : requiresDeposit ? (
            <>
              By submitting, you request this slot. You will pay the{" "}
              {formatCurrency(voucherSplit ? voucherSplit.card : totalDeposit)}
              {voucherSplit && voucherSplit.voucher > 0 ? " remaining" : ""} deposit to confirm.
            </>
          ) : (
            <>
              By submitting, your booking is confirmed instantly — no deposit
              required. You can pay in person at your appointment.
            </>
          )}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="lux-btn w-full"
        >
          {submitting
            ? "Booking…"
            : requiresDeposit && !coveredByVoucher && !certificate
              ? "Request booking"
              : "Confirm booking"}
        </button>
      </form>
    </div>
  );
}
