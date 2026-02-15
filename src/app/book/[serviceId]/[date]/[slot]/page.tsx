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
};

type Slot = { start: string; end: string };

export default function BookFormPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;
  const date = params.date as string;
  const startTime = decodeURIComponent(params.slot as string);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsFee, setSmsFee] = useState<number>(0.05);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyBySMS, setNotifyBySMS] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/services?_=${Date.now()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/slots?date=${date}&serviceId=${serviceId}`).then((r) =>
        r.json()
      ),
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
  }, [date, serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const slot = slots.find((s) => s.start === startTime);
  const endTime = slot?.end ?? "";

  const dayLabel = formatBookingDate(date, "EEEE, dd/MM/yyyy");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate: at least one contact method
    if (!email.trim() && !phone.trim()) {
      setError("Please provide either an email address or phone number (or both).");
      return;
    }

    // Validate: at least one notification method
    if (!notifyByEmail && !notifyBySMS) {
      setError("Please select at least one notification method (email or SMS).");
      return;
    }

    // Validate: if they selected email notifications, they must provide email
    if (notifyByEmail && !email.trim()) {
      setError("Email address is required if you want email notifications.");
      return;
    }

    // Validate: if they selected SMS notifications, they must provide phone
    if (notifyBySMS && !phone.trim()) {
      setError("Phone number is required if you want SMS notifications.");
      return;
    }

    setSubmitting(true);
    // Calculate total deposit (base deposit + SMS fee if SMS selected)
    const baseDeposit = service?.depositAmount ?? 0;
    const totalDeposit = baseDeposit + (notifyBySMS ? smsFee : 0);
    
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        customerName: name,
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        date,
        startTime,
        endTime,
        depositAmount: totalDeposit,
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
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!service || !slot) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Link href="/" className="text-sm text-navy hover:underline mb-6 inline-block">
          Home
        </Link>
        <p className="text-slate-600 mb-6">This time slot is no longer available.</p>
        <Link href={`/book/${serviceId}/${date}`} className="text-navy hover:underline">
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
        <Link href={`/book/${serviceId}/${date}`} className="text-sm text-navy hover:underline">
          ← Back to time slots
        </Link>
      </div>
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">
        {service.name}
      </h1>
      <p className={`text-slate-600 text-sm ${notifyBySMS ? "mb-2" : "mb-12"}`}>
        {dayLabel} · {startTime}–{endTime} · {formatCurrency(service.price)} total
        {!notifyBySMS && <> · {formatCurrency(service.depositAmount)} deposit</>}
      </p>
      {notifyBySMS && (
        <p className="text-slate-600 text-sm mb-12">
          {formatCurrency(service.depositAmount)} deposit + {formatCurrency(smsFee)} SMS fee = {formatCurrency(service.depositAmount + smsFee)} total deposit
        </p>
      )}

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
          <p className="text-xs text-slate-500 mt-1">
            Provide at least one: email or phone number
          </p>
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

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">
            How would you like to receive notifications? <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-slate-600 mb-3">
            We'll send you updates about your booking via your chosen method(s).
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyByEmail}
                onChange={(e) => {
                  const checked = e.target.checked;
                  // Prevent unchecking if SMS is also unchecked
                  if (!checked && !notifyBySMS) {
                    return;
                  }
                  setNotifyByEmail(checked);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <p className="text-xs text-slate-500">
                  {notifyByEmail && !email.trim() && (
                    <span className="text-red-500">Email address required above</span>
                  )}
                  {notifyByEmail && email.trim() && "We'll email you booking updates"}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBySMS}
                onChange={(e) => {
                  const checked = e.target.checked;
                  // Prevent unchecking if Email is also unchecked
                  if (!checked && !notifyByEmail) {
                    return;
                  }
                  setNotifyBySMS(checked);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">SMS (text message)</span>
                <p className="text-xs text-slate-500">
                  {notifyBySMS && !phone.trim() && (
                    <span className="text-red-500">Phone number required above</span>
                  )}
                  {notifyBySMS && phone.trim() && (
                    <>
                      We'll text you booking updates
                      <span className="block mt-1 text-slate-600 font-medium">
                        ⚠️ SMS notifications include a {formatCurrency(smsFee)} charge (added to your deposit)
                      </span>
                    </>
                  )}
                  {!notifyBySMS && (
                    <span className="text-slate-500">
                      SMS notifications include a £{smsFee.toFixed(2)} charge
                    </span>
                  )}
                </p>
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

        <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3">
          <p className="text-sm font-medium text-slate-700 mb-1.5">Cancellation policy</p>
          <ul className="text-sm text-slate-600 leading-relaxed list-disc list-inside space-y-1 mb-2">
            <li>Please provide at least 24 hours&apos; notice if you need to cancel or reschedule.</li>
            <li>Deposits are non-refundable for cancellations made less than 24 hours before your appointment.</li>
            <li>We may need to cancel your appointment if you arrive more than 20 minutes late.</li>
          </ul>
          <p className="text-sm text-slate-600">Thank you for your understanding.</p>
        </div>

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg">
              {error}
            </p>
            {error.toLowerCase().includes("no longer available") && (
              <p>
                <Link
                  href={`/book/${serviceId}/${date}`}
                  className="text-sm text-navy hover:underline"
                >
                  Choose another time →
                </Link>
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-slate-600 leading-relaxed">
          By submitting, you request this slot. You will pay the {formatCurrency(service.depositAmount + (notifyBySMS ? smsFee : 0))} deposit to confirm; the remaining {formatCurrency(service.price - service.depositAmount)} is due once your treatment has been completed, by cash or bank transfer.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation min-h-[48px] sm:min-h-[52px] shadow-sm"
        >
          {submitting ? "Booking…" : "Request booking"}
        </button>
      </form>
    </div>
  );
}
