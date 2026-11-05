"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopLinks from "@/components/PageTopLinks";
import { formatCurrency } from "@/lib/format";
import { categoryLabel } from "@/lib/categoryCapacity";
import { MAX_CERTIFICATE_ITEMS, VOUCHER_VALID_MONTHS, sumPrices } from "@/lib/giftVoucherRules";

type GiftService = {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  technicianId: string;
  technicianName: string;
};

type GiftPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  value: number;
  services: GiftService[];
};

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none text-base min-h-[48px]";
const labelClass = "block text-sm font-medium text-slate-700 mb-2";

function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export default function GiftCertificatesPage() {
  const [services, setServices] = useState<GiftService[]>([]);
  const [packages, setPackages] = useState<GiftPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [deliverTo, setDeliverTo] = useState<"recipient" | "me">("recipient");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);

  const loadOptions = () => {
    setLoading(true);
    setLoadFailed(false);
    fetch("/api/gift-certificates/options", { cache: "no-store" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !Array.isArray(data?.services)) throw new Error("load failed");
        const list: GiftService[] = data.services;
        setServices(list);
        setPackages(Array.isArray(data.packages) ? data.packages : []);
        setTechnicianId(list[0]?.technicianId ?? null);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(loadOptions, []);

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const technicians = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of services) if (!seen.has(s.technicianId)) seen.set(s.technicianId, s.technicianName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [services]);
  const techServicesByCategory = useMemo(() => {
    const groups = new Map<string, GiftService[]>();
    for (const s of services) {
      if (s.technicianId !== technicianId) continue;
      groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    }
    return [...groups.entries()];
  }, [services, technicianId]);

  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;
  const basket = chosen.map((id) => byId.get(id)).filter((s): s is GiftService => Boolean(s));
  const total = selectedPackage ? selectedPackage.price : sumPrices(basket);
  const hasSelection = Boolean(selectedPackage) || basket.length > 0;

  const addService = (id: string) => {
    setPackageId(null);
    setChosen((c) => (c.length >= MAX_CERTIFICATE_ITEMS ? c : [...c, id]));
  };
  const removeAt = (index: number) => setChosen((c) => c.filter((_, i) => i !== index));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hasSelection) {
      setError("Please choose a gift set or at least one treatment.");
      return;
    }
    setSubmitting(true);
    fetch("/api/vouchers/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(selectedPackage ? { packageId: selectedPackage.id } : { serviceIds: chosen }),
        recipientName,
        recipientEmail: deliverTo === "recipient" ? recipientEmail : "",
        deliverTo,
        message,
        purchaserName,
        purchaserEmail,
      }),
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
      <h1 className="font-serif text-2xl md:text-3xl font-light text-slate-800 mb-3">Gift Certificates</h1>
      <p className="text-sm text-slate-600 leading-relaxed mb-8">
        Treat someone to a treatment — or a combo — paid for in full, so there&apos;s nothing for them to
        pay at their appointment. They&apos;ll receive a gift certificate by email with your personal
        message, valid for {VOUCHER_VALID_MONTHS} months.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading treatments…</p>
      ) : loadFailed ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          We couldn&apos;t load the treatments just now.{" "}
          <button type="button" onClick={loadOptions} className="text-navy font-medium hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-8">
          {packages.length > 0 && (
            <div>
              <p className={labelClass}>Gift sets</p>
              <div className="space-y-2">
                {packages.map((p) => {
                  const active = packageId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPackageId(active ? null : p.id);
                        setChosen([]);
                      }}
                      className={`w-full text-left rounded-lg border p-4 transition ${
                        active ? "border-navy bg-slate-50 ring-1 ring-navy" : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{p.name}</p>
                          {p.description && <p className="text-sm text-slate-600 mt-0.5">{p.description}</p>}
                          <p className="text-xs text-slate-500 mt-1">
                            {p.services.map((s) => `${s.name} (${s.technicianName})`).join(" + ")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-slate-800">{formatCurrency(p.price)}</p>
                          {p.value - p.price > 0.001 && (
                            <p className="text-xs text-emerald-700">Save {formatCurrency(p.value - p.price)}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className={labelClass}>{packages.length > 0 ? "Or choose treatments" : "Choose treatments"}</p>
            <p className="text-xs text-slate-500 mb-3">Add one or more — they can book each one whenever suits them.</p>
            {technicians.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {technicians.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTechnicianId(t.id)}
                    className={`px-4 py-2 rounded-full border text-sm min-h-[40px] transition ${
                      technicianId === t.id
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {techServicesByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">No treatments available yet.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {techServicesByCategory.map(([category, list]) => (
                  <div key={category} className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {categoryLabel(category)}
                    </p>
                    {list.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">
                            {duration(s.durationMin)} · {formatCurrency(s.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addService(s.id)}
                          disabled={chosen.length >= MAX_CERTIFICATE_ITEMS}
                          className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy hover:bg-slate-50 disabled:opacity-50 min-h-[40px]"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Your gift certificate</p>
            {!hasSelection ? (
              <p className="text-sm text-slate-500">Nothing chosen yet.</p>
            ) : selectedPackage ? (
              <ul className="text-sm text-slate-700 space-y-1">
                <li className="font-medium">{selectedPackage.name}</li>
                {selectedPackage.services.map((s, i) => (
                  <li key={`${s.id}-${i}`} className="text-slate-600">
                    • {s.name} with {s.technicianName}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="text-sm text-slate-700 space-y-1">
                {basket.map((s, i) => (
                  <li key={`${s.id}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      {s.name} <span className="text-slate-500">with {s.technicianName}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums">{formatCurrency(s.price)}</span>
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="text-xs text-slate-500 hover:text-red-600"
                        aria-label={`Remove ${s.name}`}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {hasSelection && (
              <p className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm font-semibold text-slate-800">
                <span>Total — paid in full</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </p>
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
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Sophie"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="deliver"
                  checked={deliverTo === "recipient"}
                  onChange={() => setDeliverTo("recipient")}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">Email it to them now</span>
              </label>
              {deliverTo === "recipient" && (
                <input
                  id="recipient-email"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Their email address"
                />
              )}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="deliver"
                  checked={deliverTo === "me"}
                  onChange={() => setDeliverTo("me")}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">Email it to me — I&apos;ll give it to them myself</span>
              </label>
            </div>
            <div>
              <label htmlFor="message" className={labelClass}>
                Your message to them <span className="font-normal text-slate-500">(optional)</span>
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
              <p className="text-xs text-slate-500 mt-1">Shown on their gift certificate email.</p>
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
              placeholder="Your email (for your receipt)"
            />
          </div>

          {error && (
            <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !hasSelection}
            className="w-full bg-navy text-white py-4 rounded-lg font-medium hover:bg-navy-light disabled:opacity-50 transition min-h-[52px] shadow-sm"
          >
            {submitting
              ? "Redirecting to payment…"
              : hasSelection
                ? `Buy gift certificate – ${formatCurrency(total)}`
                : "Choose a treatment"}
          </button>
        </form>
      )}
    </div>
  );
}
