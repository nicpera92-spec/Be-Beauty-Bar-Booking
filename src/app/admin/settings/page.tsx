"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!t) return {};
  return { Authorization: `Bearer ${t}`, "X-Admin-Token": t };
}

// Time options every 60 mins: 00:00, 01:00, ..., 23:00
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
}

type Settings = {
  businessName: string;
  businessEmail?: string | null;
  instagramHandle?: string | null;
  defaultDepositAmount?: number | null;
  defaultPrice?: number | null;
  openTime: string;
  closeTime: string;
  slotInterval: number;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  smsNotificationFee?: number | null;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [stripeKeysChanged, setStripeKeysChanged] = useState({ secret: false, webhook: false });
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testSmsSending, setTestSmsSending] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testSmsTo, setTestSmsTo] = useState("");
  const [sessionCheck, setSessionCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setHasToken(false);
      return;
    }
    setHasToken(true);

    // Verify role from the server (not just sessionStorage) so older logins
    // without admin-role stored still work after auth changes.
    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          sessionStorage.removeItem("admin-role");
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.role) {
          sessionStorage.setItem("admin-role", data.role);
        }
        if (data.name) {
          sessionStorage.setItem("admin-name", data.name);
        }
        if (data.role !== "master") {
          router.replace("/admin");
        }
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (!hasToken) return;
    fetch("/api/admin/settings", { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setSettings(data);
          setForm({
            businessName: data.businessName,
            businessEmail: data.businessEmail ?? "",
            instagramHandle: data.instagramHandle ?? "",
            defaultDepositAmount: data.defaultDepositAmount ?? undefined,
            defaultPrice: data.defaultPrice ?? undefined,
            openTime: data.openTime ?? (data.openHour != null ? `${String(data.openHour).padStart(2, "0")}:00` : "09:00"),
            closeTime: data.closeTime ?? (data.closeHour != null ? `${String(data.closeHour).padStart(2, "0")}:00` : "17:00"),
            slotInterval: data.slotInterval,
            stripeSecretKey: "", // Always start empty for security (password field)
            stripeWebhookSecret: "", // Always start empty for security (password field)
            smsNotificationFee: data.smsNotificationFee ?? 0.05,
          });
          setStripeKeysChanged({ secret: false, webhook: false });
        }
      })
      .catch(() => {});
  }, [hasToken]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    // Build payload - only include Stripe keys if they've been changed
    const payload: Partial<Settings> = {
      businessName: form.businessName,
      businessEmail: form.businessEmail,
      instagramHandle: form.instagramHandle,
      defaultDepositAmount: form.defaultDepositAmount,
      defaultPrice: form.defaultPrice,
      openTime: form.openTime,
      closeTime: form.closeTime,
      slotInterval: form.slotInterval,
      smsNotificationFee: form.smsNotificationFee,
    };
    
    // Only include Stripe keys if user has changed them
    if (stripeKeysChanged.secret) {
      payload.stripeSecretKey = form.stripeSecretKey === "" ? null : form.stripeSecretKey;
    }
    if (stripeKeysChanged.webhook) {
      payload.stripeWebhookSecret = form.stripeWebhookSecret === "" ? null : form.stripeWebhookSecret;
    }
    
    fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (r.status === 401) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        const data = await r.json();
        if (!r.ok) {
          setSaveMessage({ ok: false, message: data.error ?? "Could not save settings" });
          return null;
        }
        return data;
      })
      .then((data) => {
        if (data) {
          setSettings(data);
          setForm({
            businessName: data.businessName,
            businessEmail: data.businessEmail ?? "",
            instagramHandle: data.instagramHandle ?? "",
            defaultDepositAmount: data.defaultDepositAmount ?? undefined,
            defaultPrice: data.defaultPrice ?? undefined,
            openTime: data.openTime ?? (data.openHour != null ? `${String(data.openHour).padStart(2, "0")}:00` : "09:00"),
            closeTime: data.closeTime ?? (data.closeHour != null ? `${String(data.closeHour).padStart(2, "0")}:00` : "17:00"),
            slotInterval: data.slotInterval,
            stripeSecretKey: "", // Always start empty for security (password field)
            stripeWebhookSecret: "", // Always start empty for security (password field)
            smsNotificationFee: data.smsNotificationFee ?? 0.05,
          });
          setStripeKeysChanged({ secret: false, webhook: false });
          setSaveMessage({ ok: true, message: "Settings saved." });
          router.refresh();
        }
      })
      .catch(() => setSaveMessage({ ok: false, message: "Save request failed" }))
      .finally(() => setSaving(false));
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white";
  const labelClass = "block text-sm text-charcoal/70 mb-1";
  const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4";

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem("admin-role");
    sessionStorage.removeItem("admin-name");
    router.replace("/admin");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">
          Business settings
        </h1>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/admin/change-password"
            className="inline-flex items-center min-h-[38px] px-3 py-1.5 rounded-lg text-sm text-charcoal/70 hover:text-charcoal hover:bg-slate-50 transition"
          >
            Change password
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-charcoal hover:bg-slate-50 hover:border-slate-300 transition"
          >
            Log out
          </button>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <section className={cardClass}>
          <h2 className="font-medium text-charcoal">Business</h2>
          <div>
            <label className={labelClass}>Business name</label>
            <input
              type="text"
              value={form.businessName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Business email</label>
            <input
              type="email"
              value={form.businessEmail ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))}
              className={inputClass}
              placeholder="you@bebeautybar.com"
            />
          </div>
          <div>
            <label className={labelClass}>Instagram handle</label>
            <input
              type="text"
              value={form.instagramHandle ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
              className={inputClass}
              placeholder="bebeautybar (without @)"
            />
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testEmailSending || !(form.businessEmail?.trim())}
                onClick={async () => {
                  setTestEmailResult(null);
                  setTestEmailSending(true);
                  try {
                    const r = await fetch("/api/admin/test-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({}),
                    });
                    const data = await r.json();
                    if (r.status === 401) {
                      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
                      router.replace("/admin");
                      return;
                    }
                    setTestEmailResult(r.ok ? { ok: true, message: data.message ?? "Sent!" } : { ok: false, message: data.error ?? "Failed" });
                  } catch {
                    setTestEmailResult({ ok: false, message: "Request failed" });
                  } finally {
                    setTestEmailSending(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
              >
                {testEmailSending ? "Sending…" : "Test email"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSessionCheck(null);
                  try {
                    const r = await fetch("/api/admin/verify-session", { headers: getAuthHeaders() });
                    const data = await r.json();
                    if (r.status === 401) {
                      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
                      router.replace("/admin");
                      return;
                    }
                    setSessionCheck(r.ok ? { ok: true, message: "Session OK ✓" } : { ok: false, message: data.error ?? "Failed" });
                  } catch {
                    setSessionCheck({ ok: false, message: "Request failed" });
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
              >
                Verify session
              </button>
              <input
                type="tel"
                value={testSmsTo}
                onChange={(e) => setTestSmsTo(e.target.value)}
                placeholder="07… for test SMS"
                className="w-40 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={testSmsSending || !testSmsTo.trim()}
                onClick={async () => {
                  setTestSmsResult(null);
                  setTestSmsSending(true);
                  try {
                    const r = await fetch("/api/admin/test-sms", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ to: testSmsTo.trim() }),
                    });
                    const data = await r.json();
                    if (r.status === 401) {
                      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
                      router.replace("/admin");
                      return;
                    }
                    setTestSmsResult(r.ok ? { ok: true, message: data.message ?? "Sent!" } : { ok: false, message: data.error ?? "Failed" });
                  } catch {
                    setTestSmsResult({ ok: false, message: "Request failed" });
                  } finally {
                    setTestSmsSending(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
              >
                {testSmsSending ? "Sending…" : "Test SMS"}
              </button>
            </div>
            {(testEmailResult || sessionCheck || testSmsResult) && (
              <div className="mt-2 space-y-1 text-sm">
                {testEmailResult && (
                  <p className={testEmailResult.ok ? "text-green-700" : "text-red-600"}>Email: {testEmailResult.message}</p>
                )}
                {sessionCheck && (
                  <p className={sessionCheck.ok ? "text-green-700" : "text-red-600"}>{sessionCheck.message}</p>
                )}
                {testSmsResult && (
                  <p className={testSmsResult.ok ? "text-green-700" : "text-red-600"}>SMS: {testSmsResult.message}</p>
                )}
              </div>
            )}
          </div>
        </section>

        <Link
          href="/admin/theme"
          className={`${cardClass} flex items-center justify-between gap-3 hover:bg-slate-50 transition touch-manipulation`}
        >
          <span className="font-medium text-charcoal">Themes</span>
          <span className="text-charcoal/40 text-lg leading-none" aria-hidden>
            ›
          </span>
        </Link>

        <section className={cardClass}>
          <h2 className="font-medium text-charcoal">Pricing &amp; deposits</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Default price (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.defaultPrice ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultPrice: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                  }))
                }
                className={inputClass}
                placeholder="50"
              />
            </div>
            <div>
              <label className={labelClass}>Default deposit (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.defaultDepositAmount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultDepositAmount: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                  }))
                }
                className={inputClass}
                placeholder="20"
              />
            </div>
            <div>
              <label className={labelClass}>SMS fee (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.smsNotificationFee ?? 0.05}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    smsNotificationFee: e.target.value === "" ? 0.05 : parseFloat(e.target.value) || 0.05,
                  }))
                }
                className={inputClass}
                placeholder="0.05"
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="font-medium text-charcoal">Availability</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Open</label>
              <select
                value={form.openTime ?? "09:00"}
                onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                className={inputClass}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Close</label>
              <select
                value={form.closeTime ?? "17:00"}
                onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                className={inputClass}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Slot (min)</label>
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={form.slotInterval ?? 30}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slotInterval: parseInt(e.target.value, 10) || 30,
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-charcoal">Card payments</h2>
            {settings?.stripeSecretKey && (
              <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                ✓ Connected
              </span>
            )}
          </div>
          <a
            href="https://dashboard.stripe.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#635bff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5851ea] transition"
          >
            Sign up or log in to Stripe
          </a>
          <div>
            <label className={labelClass}>Stripe secret key</label>
            <input
              type="password"
              value={form.stripeSecretKey ?? ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, stripeSecretKey: e.target.value }));
                setStripeKeysChanged((prev) => ({ ...prev, secret: true }));
              }}
              className={`${inputClass} font-mono text-sm`}
              placeholder={settings?.stripeSecretKey ? "Leave empty to keep current" : "sk_..."}
            />
          </div>
          <div>
            <label className={labelClass}>
              Webhook secret
              {settings?.stripeWebhookSecret && (
                <span className="ml-2 text-green-600 text-xs font-medium">✓ Set</span>
              )}
            </label>
            <input
              type="password"
              value={form.stripeWebhookSecret ?? ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, stripeWebhookSecret: e.target.value }));
                setStripeKeysChanged((prev) => ({ ...prev, webhook: true }));
              }}
              className={`${inputClass} font-mono text-sm`}
              placeholder={settings?.stripeWebhookSecret ? "Leave empty to keep current" : "whsec_… (optional)"}
            />
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="font-medium text-charcoal">Booking rules</h2>
          <p className="text-sm text-slate-500">
            How many appointments per category can run at the same time across the salon.
          </p>
          <CategoryRulesEditor getAuthHeaders={getAuthHeaders} />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-navy text-white py-3 rounded-full font-medium hover:bg-navy-light disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saveMessage && (
          <p className={`text-sm text-center ${saveMessage.ok ? "text-green-700" : "text-red-600"}`}>
            {saveMessage.message}
          </p>
        )}
      </form>
    </div>
  );
}

type CategoryRule = {
  category: string;
  label: string;
  maxConcurrent: number;
};

function CategoryRulesEditor({
  getAuthHeaders,
}: {
  getAuthHeaders: () => Record<string, string>;
}) {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/category-rules", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [getAuthHeaders]);

  const save = () => {
    setSaving(true);
    setMessage(null);
    fetch("/api/admin/category-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        rules: rules.map((r) => ({ category: r.category, maxConcurrent: r.maxConcurrent })),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMessage("Rules saved.");
      })
      .catch((err) => setMessage(err?.message ?? "Could not save rules"))
      .finally(() => setSaving(false));
  };

  if (rules.length === 0) {
    return <p className="text-sm text-slate-500">Loading rules…</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((r, i) => (
        <div key={r.category} className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-charcoal min-w-[140px]">{r.label}</span>
          <label className="text-sm text-slate-600">
            Max at once{" "}
            <input
              type="number"
              min={1}
              max={20}
              value={r.maxConcurrent}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRules((prev) =>
                  prev.map((x, idx) => (idx === i ? { ...x, maxConcurrent: val } : x))
                );
              }}
              className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        </div>
      ))}
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save booking rules"}
      </button>
    </div>
  );
}
