"use client";

import { useEffect, useState } from "react";
import { formatBookingDate } from "@/lib/format";

type DateMode = "single" | "range" | "earlier";

type WaitlistJoinFormProps = {
  serviceId: string;
  technicianId: string;
  preferredDate: string;
  dateLabel: string;
  minBookableDate: string;
  maxBookableDate: string;
};

export default function WaitlistJoinForm({
  serviceId,
  technicianId,
  preferredDate,
  dateLabel,
  minBookableDate,
  maxBookableDate,
}: WaitlistJoinFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyBySMS, setNotifyBySMS] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [rangeStartDate, setRangeStartDate] = useState(preferredDate);
  const [rangeEndDate, setRangeEndDate] = useState(preferredDate);
  const [earlierLatestDate, setEarlierLatestDate] = useState(preferredDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successDateLabel, setSuccessDateLabel] = useState(dateLabel);

  const canOfferEarlier = preferredDate > minBookableDate;

  useEffect(() => {
    setRangeStartDate(preferredDate);
    setRangeEndDate(preferredDate);
    setEarlierLatestDate(preferredDate);
    setDateMode("single");
    setSuccess(false);
  }, [preferredDate]);

  const formatRangeLabel = (start: string, end: string) => {
    if (start === end) {
      try {
        return formatBookingDate(start, "EEEE, d MMMM yyyy");
      } catch {
        return dateLabel;
      }
    }
    try {
      const startLabel = formatBookingDate(start, "d MMMM");
      const endLabel = formatBookingDate(end, "d MMMM yyyy");
      return `${startLabel} to ${endLabel}`;
    } catch {
      return dateLabel;
    }
  };

  const formatEarlierLabel = (latest: string) => {
    try {
      const formatted = formatBookingDate(latest, "EEEE, d MMMM yyyy");
      return `${formatted} or any earlier day`;
    } catch {
      return `${dateLabel} or any earlier day`;
    }
  };

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

    let startDate = preferredDate;
    let endDate: string | undefined;
    let notifyEarliest = false;

    if (dateMode === "range") {
      startDate = rangeStartDate;
      endDate = rangeEndDate;
      if (startDate < minBookableDate) {
        setError("Start date must be in the future.");
        return;
      }
      if (endDate < startDate) {
        setError("The second date must be on or after the first.");
        return;
      }
    } else if (dateMode === "earlier") {
      startDate = earlierLatestDate;
      notifyEarliest = true;
      if (startDate <= minBookableDate) {
        setError("Choose a later date to include earlier days.");
        return;
      }
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
          preferredDate: startDate,
          preferredDateEnd: endDate && endDate !== startDate ? endDate : undefined,
          notifyEarliest,
          notifyByEmail,
          notifyBySMS,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Could not join the waiting list.");
        return;
      }
      if (dateMode === "earlier") {
        setSuccessDateLabel(formatEarlierLabel(startDate));
      } else if (dateMode === "range") {
        setSuccessDateLabel(formatRangeLabel(startDate, endDate ?? startDate));
      } else {
        setSuccessDateLabel(dateLabel);
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
          We&apos;ll contact you if a slot opens on {successDateLabel}.
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
          <p className="text-sm font-medium text-slate-800">
            {dateMode === "single" ? `Waiting list for ${dateLabel}` : "Join the waiting list"}
          </p>

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

          <fieldset className="space-y-2">
            <legend className="text-xs text-slate-600 mb-1">Which dates?</legend>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="waitlist-date-mode"
                checked={dateMode === "single"}
                onChange={() => setDateMode("single")}
                className="mt-0.5 border-slate-300 text-navy focus:ring-navy/20"
              />
              <span>This day only ({dateLabel})</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="waitlist-date-mode"
                checked={dateMode === "range"}
                onChange={() => {
                  setDateMode("range");
                  setRangeStartDate(preferredDate);
                  setRangeEndDate(preferredDate);
                }}
                className="mt-0.5 border-slate-300 text-navy focus:ring-navy/20"
              />
              <span>A <strong>range of dates</strong> (from – to)</span>
            </label>
            {canOfferEarlier && (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="waitlist-date-mode"
                  checked={dateMode === "earlier"}
                  onChange={() => {
                    setDateMode("earlier");
                    setEarlierLatestDate(preferredDate);
                  }}
                  className="mt-0.5 border-slate-300 text-navy focus:ring-navy/20"
                />
                <span>This date or any <strong>earlier</strong> day</span>
              </label>
            )}
          </fieldset>

          {dateMode === "range" && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="waitlist-start-date" className="block text-xs text-slate-600 mb-1">
                    From
                  </label>
                  <input
                    id="waitlist-start-date"
                    type="date"
                    required
                    min={minBookableDate}
                    max={maxBookableDate}
                    value={rangeStartDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRangeStartDate(next);
                      if (rangeEndDate < next) setRangeEndDate(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="waitlist-end-date" className="block text-xs text-slate-600 mb-1">
                    To
                  </label>
                  <input
                    id="waitlist-end-date"
                    type="date"
                    required
                    min={rangeStartDate}
                    max={maxBookableDate}
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                We&apos;ll let you know if a slot opens on any day from{" "}
                {formatRangeLabel(rangeStartDate, rangeEndDate)}.
              </p>
            </div>
          )}

          {dateMode === "earlier" && (
            <div className="space-y-2">
              <div>
                <label htmlFor="waitlist-earlier-date" className="block text-xs text-slate-600 mb-1">
                  Latest date
                </label>
                <input
                  id="waitlist-earlier-date"
                  type="date"
                  required
                  min={minBookableDate}
                  max={maxBookableDate}
                  value={earlierLatestDate}
                  onChange={(e) => setEarlierLatestDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none"
                />
              </div>
              <p className="text-xs text-slate-500">
                We&apos;ll notify you if a slot opens on {formatEarlierLabel(earlierLatestDate)}.
              </p>
            </div>
          )}

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
