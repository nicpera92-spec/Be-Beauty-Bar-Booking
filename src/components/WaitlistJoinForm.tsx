"use client";

import { useState } from "react";
import { formatBookingDate } from "@/lib/format";

type WaitlistJoinFormProps = {
  serviceId: string;
  technicianId: string;
  preferredDate: string;
  dateLabel: string;
};

export default function WaitlistJoinForm({
  serviceId,
  technicianId,
  preferredDate,
  dateLabel,
}: WaitlistJoinFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyBySMS, setNotifyBySMS] = useState(false);
  const [notifyEarliest, setNotifyEarliest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() && !phone.trim()) {
      setError("Please provide an email or phone number.");
      return;
    }
    if (!notifyByEmail && !notifyBySMS) {
      setError("Please choose at least one way to be notified.");
      return;
    }
    if (notifyByEmail && !email.trim()) {
      setError("Email is required for email notifications.");
      return;
    }
    if (notifyBySMS && !phone.trim()) {
      setError("Phone is required for SMS notifications.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          technicianId,
          customerName: name.trim(),
          customerEmail: email.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          preferredDate,
          notifyByEmail,
          notifyBySMS,
          notifyEarliest,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Could not join the waiting list.");
        return;
      }
      setSuccess(true);
      setOpen(false);
    } catch {
      setError("Could not join the waiting list. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 text-sm text-green-900">
        <p className="font-medium">You&apos;re on the waiting list</p>
        <p className="mt-1 text-green-800/90">
          We&apos;ll contact you if a slot opens for {dateLabel}
          {notifyEarliest ? " or an earlier date" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-600 text-sm">
        This day is fully booked. Join the waiting list and we&apos;ll let you know if something opens up.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition"
        >
          Join waiting list
        </button>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">Waiting list for {dateLabel}</p>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Your name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs text-slate-600 mb-1">Notify me by</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={notifyByEmail}
                onChange={(e) => setNotifyByEmail(e.target.checked)}
                className="rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={notifyBySMS}
                onChange={(e) => setNotifyBySMS(e.target.checked)}
                className="rounded border-slate-300 text-navy focus:ring-navy/20"
              />
              Text message
            </label>
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notifyEarliest}
              onChange={(e) => setNotifyEarliest(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-navy focus:ring-navy/20"
            />
            <span>
              Also notify me if an <strong>earlier date</strong> becomes available before{" "}
              {formatBookingDate(preferredDate, "d MMMM")}
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50"
            >
              {submitting ? "Joining…" : "Join list"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
