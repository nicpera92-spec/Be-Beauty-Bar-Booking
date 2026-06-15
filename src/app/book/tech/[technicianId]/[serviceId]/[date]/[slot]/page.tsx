"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatBookingDate, formatCurrency } from "@/lib/format";

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
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [notifyBySMS, setNotifyBySMS] = useState(true);

  const datePageHref = `/book/tech/${technicianId}/${serviceId}`;

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/services?technicianId=${encodeURIComponent(technicianId)}&_=${Date.now()}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/slots?date=${date}&serviceId=${encodeURIComponent(serviceId)}&technicianId=${encodeURIComponent(technicianId)}`
      ).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([servicesRes, slotsRes, settingsRes]) => {
        const list = Array.isArray(servicesRes) ? servicesRes : [];
        const s = list.find((x: { id: string }) => x.id === serviceId);
        setService(s ?? null);
        setSlots(slotsRes.slots ?? []);
        setSmsFee(settingsRes?.smsNotificationFee ?? 0.05);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, serviceId, technicianId]);

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
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-16 sm:py-20 md:py-28">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-8">
        <Link href="/" className="text-sm text-navy hover:underline">
          Home
        </Link>
        <Link href={datePageHref} className="text-sm text-navy hover:underline">
          ← Back to time slots
        </Link>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
        {service.name}
      </h1>
      <p className="text-slate-600 text-sm mb-12">
        {dayLabel} · {startTime}–{endTime} · {formatCurrency(totalPrice)} total
        {requiresDeposit ? (
          <> · {formatCurrency(totalDeposit)} deposit</>
        ) : (
          <> · No deposit required</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
            Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 sm:py-3.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none text-base min-h-[48px]"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
            Phone {notifyBySMS && <span className="text-red-500">*</span>}
          </label>
          <input
            id="phone"
            type="tel"
            required={notifyBySMS}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 sm:py-3.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none text-base min-h-[48px]"
            placeholder="07xxx xxxxxx"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
            Email {notifyByEmail && <span className="text-red-500">*</span>}
          </label>
          <input
            id="email"
            type="email"
            required={notifyByEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 sm:py-3.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none text-base min-h-[48px]"
            placeholder="you@example.com"
          />
          <p className="text-xs text-slate-500 mt-1">Provide at least one: phone number or email</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">
            How would you like to receive notifications? <span className="text-red-500">*</span>
          </p>
          <div className="space-y-2">
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
                <span className="text-sm font-medium text-slate-700">SMS (text message)</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  SMS notifications include a {formatCurrency(smsFee)} charge
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
                <span className="text-sm font-medium text-slate-700">Email</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 sm:py-3.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none resize-none min-h-[80px]"
            placeholder="Any special requests?"
          />
        </div>

        <div
          className={`rounded-lg border-2 px-4 py-3 ${
            policyError ? "border-red-400 bg-red-50" : "border-black bg-slate-50/30"
          }`}
        >
          <p className="text-sm font-medium text-slate-700 mb-1.5 underline">Cancellation policy</p>
          <ul className="text-xs text-slate-600 leading-relaxed list-disc list-outside pl-5 ml-1 space-y-1 mb-2">
            <li>Please provide at least 24 hours&apos; notice if you need to cancel or reschedule.</li>
            <li>
              Deposits are non-refundable for cancellations made less than 24 hours before your
              appointment.
            </li>
          </ul>
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
            <span className="text-xs text-slate-700">
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

        <p className="text-sm text-slate-600 leading-relaxed">
          {requiresDeposit ? (
            <>
              By submitting, you request this slot. You will pay the{" "}
              {formatCurrency(totalDeposit)} deposit to confirm.
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
          className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition touch-manipulation min-h-[48px] shadow-sm"
        >
          {submitting ? "Booking…" : requiresDeposit ? "Request booking" : "Confirm booking"}
        </button>
      </form>
    </div>
  );
}
