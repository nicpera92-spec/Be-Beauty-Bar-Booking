"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import NumberField from "@/components/NumberField";
import { normalizeVoucherCode } from "@/lib/giftVoucherRules";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Voucher = {
  id: string;
  code: string;
  initialAmount: number;
  balance: number;
  status: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  soldInSalon: boolean;
  expiresAt: string | null;
  createdAt: string;
  transactions: { id: string; amount: number; note: string; createdAt: string }[];
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white";

function VoucherRow({ voucher, onChanged }: { voucher: Voucher; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = voucher.expiresAt ? new Date(voucher.expiresAt) < new Date() : false;
  const statusLabel =
    voucher.status === "cancelled" ? "Cancelled" : expired ? "Expired" : voucher.balance <= 0 ? "Used up" : "Active";

  const act = (action: "use" | "add" | "cancel") => {
    if (action === "cancel" && !confirm(`Cancel voucher ${voucher.code}? It can't be used after this.`)) return;
    setBusy(true);
    setError(null);
    fetch(`/api/admin/vouchers/${voucher.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ action, amount, note }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Update failed");
        setAmount(0);
        setNote("");
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
            {formatCurrency(voucher.initialAmount)} voucher
            {voucher.expiresAt && ` · expires ${new Date(voucher.expiresAt).toLocaleDateString("en-GB")}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold text-charcoal tabular-nums">{formatCurrency(voucher.balance)}</p>
          <p className="text-xs text-charcoal/55">{statusLabel}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-sm text-navy hover:underline"
      >
        {open ? "Hide" : "Manage & history"}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {voucher.status === "active" && (
            <div className="grid sm:grid-cols-[110px_1fr_auto_auto] gap-2 items-center">
              <NumberField
                min={0}
                step={0.01}
                value={amount}
                onValueChange={setAmount}
                className={inputClass}
                placeholder="£"
              />
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
                onClick={() => act("use")}
                className="px-3 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50"
              >
                Use in salon
              </button>
              <button
                type="button"
                disabled={busy || amount <= 0}
                onClick={() => act("add")}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Add back
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
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
              onClick={() => act("cancel")}
              disabled={busy}
              className="text-xs text-red-600 hover:underline"
            >
              Cancel voucher
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminVouchersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newAmount, setNewAmount] = useState(50);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/vouchers", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setVouchers(Array.isArray(data) ? data : []))
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

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    fetch("/api/admin/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ amount: newAmount, recipientName: newName, recipientEmail: newEmail, sendEmail }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error ?? "Could not create voucher");
        setCreateMsg(`Created ${data.code}${sendEmail && newEmail ? " and emailed it" : ""}.`);
        setNewName("");
        setNewEmail("");
        load();
      })
      .catch((err) => setCreateMsg(err?.message ?? "Could not create voucher"))
      .finally(() => setCreating(false));
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
  const outstanding = vouchers
    .filter((v) => v.status === "active" && (!v.expiresAt || new Date(v.expiresAt) >= new Date()))
    .reduce((sum, v) => sum + v.balance, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Gift vouchers</h1>
        <Link
          href="/admin"
          className="text-sm text-charcoal/70 hover:text-navy px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-charcoal/60 mb-5">
        Customers buy vouchers at{" "}
        <a href="/gift-vouchers" target="_blank" className="text-navy hover:underline">
          /gift-vouchers
        </a>
        . Codes pay deposits online; record anything used in the salon here. Unused value outstanding:{" "}
        <strong>{formatCurrency(outstanding)}</strong>.
      </p>

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
          + Voucher sold in salon
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <label className="text-xs text-charcoal/60">
              Amount (£)
              <NumberField integer min={10} max={500} value={newAmount} onValueChange={setNewAmount} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs text-charcoal/60">
              Recipient name
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs text-charcoal/60">
              Recipient email (optional)
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email the voucher to them
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create voucher"}
            </button>
            {createMsg && <p className="text-sm text-charcoal/75">{createMsg}</p>}
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-charcoal/60">Loading vouchers…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-charcoal/60">{term ? "No vouchers match." : "No vouchers yet."}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VoucherRow key={v.id} voucher={v} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
