"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBookingDate, formatCurrency } from "@/lib/format";
import NumberField from "@/components/NumberField";
import { normalizeVoucherCode, sumPrices, voucherRefundAmount } from "@/lib/giftVoucherRules";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type CertificateItem = {
  id: string;
  serviceName: string;
  technicianName: string | null;
  price: number;
  status: string;
  bookingId: string | null;
  usedAt: string | null;
  bookings: { id: string; date: string; startTime: string; status: string }[];
};

type Voucher = {
  id: string;
  code: string;
  kind: string;
  packageName: string | null;
  initialAmount: number;
  balance: number;
  status: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  soldInSalon: boolean;
  expiresAt: string | null;
  createdAt: string;
  transactions: { id: string; amount: number; note: string; createdAt: string }[];
  items: CertificateItem[];
};

type GiftService = { id: string; name: string; price: number; technicianName: string };
type GiftPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  serviceIds: string[];
  active: boolean;
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white";

type CancelResult = { refundAmount?: number; refund?: "refunded" | "manual" | "none" };

function patchVoucher(id: string, body: Record<string, unknown>): Promise<CancelResult> {
  return fetch(`/api/admin/vouchers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  })
    .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data?.error ?? "Update failed");
      return data as CancelResult;
    });
}

function itemStatus(item: CertificateItem, today: string): string {
  if (item.status === "used") {
    return item.usedAt ? `Used in salon ${new Date(item.usedAt).toLocaleDateString("en-GB")}` : "Used";
  }
  if (item.status === "booked") {
    const booking = item.bookings.find((b) => b.id === item.bookingId);
    if (!booking) return "Booked";
    const when = `${formatBookingDate(booking.date, "d MMM yyyy")} ${booking.startTime}`;
    return booking.date < today ? `Used ${when}` : `Booked for ${when}`;
  }
  return "Available";
}

function CertificateRow({ voucher, onChanged }: { voucher: Voucher; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCertificate = voucher.kind === "certificate";
  const expired = voucher.expiresAt ? new Date(voucher.expiresAt) < new Date() : false;
  const available = voucher.items.filter((i) => i.status === "available").length;
  const statusLabel =
    voucher.status === "cancelled"
      ? "Cancelled"
      : expired
        ? "Expired"
        : isCertificate
          ? available > 0
            ? `${available} of ${voucher.items.length} to book`
            : "All booked / used"
          : voucher.balance <= 0
            ? "Used up"
            : "Active";
  const today = new Date().toISOString().slice(0, 10);

  const refundAmount = voucherRefundAmount(voucher);
  const cancelConfirmText = [
    `Cancel ${voucher.code}? The code will stop working straight away.`,
    refundAmount >= 0.01
      ? voucher.soldInSalon
        ? `It was sold in the salon, so refund ${formatCurrency(refundAmount)} to them yourself.`
        : `${formatCurrency(refundAmount)} will be refunded to the buyer's card${
            isCertificate && available < voucher.items.length ? " (for the treatments not yet booked or used)" : ""
          }, and they'll be emailed.`
      : "Nothing is left to refund.",
    isCertificate && voucher.items.some((i) => i.status === "booked")
      ? "Treatments already booked stay booked."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const act = (body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    patchVoucher(voucher.id, body)
      .then((result) => {
        setAmount(0);
        setNote("");
        if (body.action === "cancel" && result.refund === "manual") {
          alert(
            `Cancelled. Please refund ${formatCurrency(result.refundAmount ?? 0)} ${
              voucher.soldInSalon ? "in the salon" : "in Stripe — the automatic refund didn't go through"
            }.`
          );
        }
        onChanged();
      })
      .catch((e) => setError(e?.message ?? "Update failed"))
      .finally(() => setBusy(false));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-charcoal tracking-wide">{voucher.code}</p>
          <p className="text-sm text-charcoal/70 mt-0.5">
            {voucher.recipientName ? `For ${voucher.recipientName}` : "No recipient name"}
            {voucher.soldInSalon ? " · sold in salon" : ` · bought by ${voucher.purchaserName}`}
          </p>
          <p className="text-xs text-charcoal/50 mt-0.5">
            {isCertificate
              ? `${voucher.packageName ? `${voucher.packageName} · ` : ""}${formatCurrency(voucher.initialAmount)} paid`
              : `Old credit voucher · ${formatCurrency(voucher.initialAmount)}`}
            {voucher.expiresAt && ` · expires ${new Date(voucher.expiresAt).toLocaleDateString("en-GB")}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          {!isCertificate && (
            <p className="text-lg font-semibold text-charcoal tabular-nums">{formatCurrency(voucher.balance)}</p>
          )}
          <p className="text-xs text-charcoal/55">{statusLabel}</p>
        </div>
      </div>

      {isCertificate && (
        <ul className="mt-3 space-y-1.5">
          {voucher.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-charcoal min-w-0">
                {item.serviceName}
                {item.technicianName && <span className="text-charcoal/55"> · {item.technicianName}</span>}
                <span className="text-charcoal/55"> · {itemStatus(item, today)}</span>
              </span>
              {voucher.status === "active" && item.status === "available" && !expired && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    act({ action: "use_item", itemId: item.id }, `Mark ${item.serviceName} as used in the salon?`)
                  }
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-navy hover:bg-slate-50 disabled:opacity-50"
                >
                  Used in salon
                </button>
              )}
              {item.status === "used" && !item.bookingId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: "unuse_item", itemId: item.id })}
                  className="text-xs text-charcoal/60 hover:underline disabled:opacity-50"
                >
                  Undo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-sm text-navy hover:underline"
      >
        {open ? "Hide" : "Details & history"}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {voucher.message && (
            <p className="text-sm text-charcoal/75 italic">“{voucher.message}”</p>
          )}
          {(voucher.recipientEmail || (!voucher.soldInSalon && voucher.purchaserEmail)) && (
            <p className="text-xs text-charcoal/55">
              {voucher.recipientEmail && <>Sent to {voucher.recipientEmail}</>}
              {voucher.recipientEmail && !voucher.soldInSalon && " · "}
              {!voucher.soldInSalon && <>Buyer {voucher.purchaserEmail}</>}
            </p>
          )}
          {!isCertificate && voucher.status === "active" && (
            <div className="grid sm:grid-cols-[110px_1fr_auto_auto] gap-2 items-center">
              <NumberField min={0} step={0.01} value={amount} onValueChange={setAmount} className={inputClass} placeholder="£" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy || amount <= 0}
                onClick={() => act({ action: "use", amount, note })}
                className="px-3 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50"
              >
                Use in salon
              </button>
              <button
                type="button"
                disabled={busy || amount <= 0}
                onClick={() => act({ action: "add", amount, note })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Add back
              </button>
            </div>
          )}
          <div className="space-y-1">
            {voucher.transactions.map((t) => (
              <div key={t.id} className="flex justify-between gap-2 text-xs text-charcoal/70">
                <span>
                  {new Date(t.createdAt).toLocaleDateString("en-GB")} · {t.note}
                </span>
                {t.amount !== 0 && (
                  <span className={`tabular-nums ${t.amount < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {t.amount > 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(t.amount))}
                  </span>
                )}
              </div>
            ))}
          </div>
          {voucher.status === "active" && (
            <button
              type="button"
              onClick={() => act({ action: "cancel" }, cancelConfirmText)}
              disabled={busy}
              className="text-xs text-red-600 hover:underline"
            >
              Cancel {isCertificate ? "certificate" : "voucher"}
              {refundAmount >= 0.01 && ` & refund ${formatCurrency(refundAmount)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pick treatments (repeats allowed) — used for combo packages and salon-sold certificates. */
function TreatmentPicker({
  services,
  value,
  onChange,
}: {
  services: GiftService[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const byId = new Map(services.map((s) => [s.id, s]));
  return (
    <div className="space-y-2">
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
        className={inputClass}
      >
        <option value="">+ Add a treatment…</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.technicianName} · {formatCurrency(s.price)}
          </option>
        ))}
      </select>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((id, i) => {
            const s = byId.get(id);
            return (
              <li key={`${id}-${i}`} className="flex justify-between gap-2 text-sm text-charcoal">
                <span>
                  {s ? `${s.name} · ${s.technicianName}` : "Removed treatment"}
                  {s && <span className="text-charcoal/55"> · {formatCurrency(s.price)}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="text-xs text-charcoal/55 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PackageEditor({
  services,
  initial,
  onSaved,
  onCancel,
}: {
  services: GiftService[];
  initial?: GiftPackage;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(initial?.serviceIds ?? []);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(services.map((s) => [s.id, s]));
  const value = sumPrices(serviceIds.map((id) => byId.get(id)).filter((s): s is GiftService => Boolean(s)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    fetch(initial ? `/api/admin/gift-packages/${initial.id}` : "/api/admin/gift-packages", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ name, description, serviceIds, price, active: initial?.active ?? true }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Could not save");
        onSaved();
      })
      .catch((err) => setError(err?.message ?? "Could not save"))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={save} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-xs text-charcoal/60">
          Package name
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} placeholder="e.g. Pamper Package" />
        </label>
        <label className="text-xs text-charcoal/60">
          Short description (optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <div className="text-xs text-charcoal/60">
        Treatments in this combo
        <div className="mt-1">
          <TreatmentPicker services={services} value={serviceIds} onChange={setServiceIds} />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-charcoal/60">
          Package price (£)
          <NumberField min={0} step={0.01} value={price} onValueChange={setPrice} className={`${inputClass} mt-1 max-w-[140px]`} />
        </label>
        {value > 0 && (
          <p className="text-xs text-charcoal/55 pb-2">
            Separately {formatCurrency(value)}
            {value - price > 0.001 && price > 0 && ` · customers save ${formatCurrency(value - price)}`}
            {price === 0 && (
              <>
                {" · "}
                <button type="button" onClick={() => setPrice(value)} className="text-navy hover:underline">
                  use {formatCurrency(value)}
                </button>
              </>
            )}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50">
          {busy ? "Saving…" : "Save package"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminVouchersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [services, setServices] = useState<GiftService[]>([]);
  const [packages, setPackages] = useState<GiftPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPackage, setEditingPackage] = useState<GiftPackage | "new" | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPackageId, setNewPackageId] = useState("");
  const [newServiceIds, setNewServiceIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/vouchers", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/gift-packages", { headers: getAuthHeaders(), cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/gift-certificates/options", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([v, p, options]) => {
        setVouchers(Array.isArray(v) ? v : []);
        setPackages(Array.isArray(p) ? p : []);
        setServices(Array.isArray(options?.services) ? options.services : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
      router.replace("/admin");
      return;
    }
    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role !== "master") router.replace("/admin");
        else setReady(true);
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    fetch("/api/admin/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        ...(newPackageId ? { packageId: newPackageId } : { serviceIds: newServiceIds }),
        recipientName: newName,
        recipientEmail: newEmail,
        message: newMessage,
        sendEmail,
      }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Could not create certificate");
        setCreateMsg(`Created ${data.code}${sendEmail && newEmail ? " and emailed it" : ""}.`);
        setNewName("");
        setNewEmail("");
        setNewMessage("");
        setNewServiceIds([]);
        setNewPackageId("");
        load();
      })
      .catch((err) => setCreateMsg(err?.message ?? "Could not create certificate"))
      .finally(() => setCreating(false));
  };

  const togglePackage = (pkg: GiftPackage) => {
    fetch(`/api/admin/gift-packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ active: !pkg.active }),
    }).then(load);
  };
  const deletePackage = (pkg: GiftPackage) => {
    if (!confirm(`Delete the "${pkg.name}" package? Certificates already sold aren't affected.`)) return;
    fetch(`/api/admin/gift-packages/${pkg.id}`, { method: "DELETE", headers: getAuthHeaders() }).then(load);
  };

  const normalizedSearch = normalizeVoucherCode(search);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? vouchers.filter(
        (v) =>
          (normalizedSearch && v.code === normalizedSearch) ||
          v.code.toLowerCase().includes(term) ||
          (v.recipientName ?? "").toLowerCase().includes(term) ||
          v.purchaserName.toLowerCase().includes(term) ||
          (v.recipientEmail ?? "").includes(term) ||
          v.purchaserEmail.includes(term)
      )
    : vouchers;
  const now = new Date();
  const live = vouchers.filter((v) => v.status === "active" && (!v.expiresAt || new Date(v.expiresAt) >= now));
  const treatmentsToBook = live.reduce((n, v) => n + v.items.filter((i) => i.status === "available").length, 0);
  const creditOutstanding = live.filter((v) => v.kind === "credit").reduce((sum, v) => sum + v.balance, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Gift certificates</h1>
        <Link
          href="/admin"
          className="text-sm text-charcoal/70 hover:text-navy px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-charcoal/60 mb-5">
        Customers buy treatments (or combos) in full at{" "}
        <a href="/gift-vouchers" target="_blank" className="text-navy hover:underline">
          /gift-vouchers
        </a>
        . The person it&apos;s for books online with the code — nothing to pay. Treatments still to be
        booked: <strong>{treatmentsToBook}</strong>
        {creditOutstanding > 0 && (
          <>
            {" "}· old credit vouchers outstanding: <strong>{formatCurrency(creditOutstanding)}</strong>
          </>
        )}
        .
      </p>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Combo packages</h2>
          {editingPackage === null && (
            <button
              type="button"
              onClick={() => setEditingPackage("new")}
              className="text-sm text-navy font-medium hover:underline"
            >
              + New package
            </button>
          )}
        </div>
        <p className="text-xs text-charcoal/55 mb-3">
          Ready-made combos shown at the top of the gift page, at your own price. Customers can also pick any
          treatments themselves.
        </p>
        {editingPackage === "new" && (
          <PackageEditor
            services={services}
            onSaved={() => {
              setEditingPackage(null);
              load();
            }}
            onCancel={() => setEditingPackage(null)}
          />
        )}
        <div className="space-y-2 mt-2">
          {packages.map((pkg) =>
            editingPackage !== "new" && editingPackage?.id === pkg.id ? (
              <PackageEditor
                key={pkg.id}
                services={services}
                initial={pkg}
                onSaved={() => {
                  setEditingPackage(null);
                  load();
                }}
                onCancel={() => setEditingPackage(null)}
              />
            ) : (
              <div key={pkg.id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">
                    {pkg.name} · {formatCurrency(pkg.price)}
                    {!pkg.active && <span className="text-xs text-charcoal/50 font-normal"> · hidden</span>}
                  </p>
                  <p className="text-xs text-charcoal/60 mt-0.5">
                    {pkg.serviceIds
                      .map((id) => {
                        const s = serviceById.get(id);
                        return s ? `${s.name} (${s.technicianName})` : "Removed treatment";
                      })
                      .join(" + ")}
                  </p>
                </div>
                <div className="flex gap-3 text-xs shrink-0">
                  <button type="button" onClick={() => setEditingPackage(pkg)} className="text-navy hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => togglePackage(pkg)} className="text-charcoal/70 hover:underline">
                    {pkg.active ? "Hide" : "Show"}
                  </button>
                  <button type="button" onClick={() => deletePackage(pkg)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
          {!loading && packages.length === 0 && editingPackage !== "new" && (
            <p className="text-sm text-charcoal/55">No combo packages yet.</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code, name or email"
          className={`${inputClass} flex-1 min-w-[200px] min-h-[42px]`}
        />
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-navy hover:bg-slate-50 min-h-[42px]"
        >
          + Certificate sold in salon
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-4 space-y-3">
          {packages.some((p) => p.active) && (
            <label className="block text-xs text-charcoal/60">
              Combo package
              <select
                value={newPackageId}
                onChange={(e) => setNewPackageId(e.target.value)}
                className={`${inputClass} mt-1`}
              >
                <option value="">— Choose treatments instead —</option>
                {packages
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatCurrency(p.price)}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {!newPackageId && (
            <div className="text-xs text-charcoal/60">
              Treatments
              <div className="mt-1">
                <TreatmentPicker services={services} value={newServiceIds} onChange={setNewServiceIds} />
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-charcoal/60">
              Recipient name
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs text-charcoal/60">
              Recipient email (optional)
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
          </div>
          <label className="block text-xs text-charcoal/60">
            Message for them (optional)
            <textarea
              rows={2}
              maxLength={500}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className={`${inputClass} mt-1 resize-none`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email the certificate to them
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating || (!newPackageId && newServiceIds.length === 0)}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create certificate"}
            </button>
            {createMsg && <p className="text-sm text-charcoal/75">{createMsg}</p>}
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-charcoal/60">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-charcoal/60">{term ? "Nothing matches." : "No gift certificates yet."}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <CertificateRow key={v.id} voucher={v} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
