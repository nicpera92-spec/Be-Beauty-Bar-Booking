"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeEditor from "@/components/ThemeEditor";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  findThemePalette,
} from "@/lib/themePalettes";
import { publishThemeUpdate } from "@/lib/themeClient";

const ADMIN_TOKEN_KEY = "admin-token";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
}

type SettingsTab = "business" | "branding" | "bookings" | "payments";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "branding", label: "Branding" },
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments" },
];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "business" || value === "branding" || value === "bookings" || value === "payments";
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!t) return {};
  return { Authorization: `Bearer ${t}`, "X-Admin-Token": t };
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
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

type CategoryRule = {
  category: string;
  label: string;
  maxConcurrent: number;
};

function AdminSettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Partial<Settings>>({});
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [tab, setTab] = useState<SettingsTab>("business");
  const [saving, setSaving] = useState(false);
  const [stripeKeysChanged, setStripeKeysChanged] = useState({ secret: false, webhook: false });
  const [showStripeKeys, setShowStripeKeys] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testSmsSending, setTestSmsSending] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testSmsTo, setTestSmsTo] = useState("");
  const [sessionCheck, setSessionCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (isSettingsTab(tabParam)) setTab(tabParam);
  }, [searchParams]);

  const switchTab = (next: SettingsTab) => {
    setTab(next);
    setSaveMessage(null);
    router.replace(`/admin/settings?tab=${next}`, { scroll: false });
  };

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setHasToken(false);
      return;
    }
    setHasToken(true);

    fetch("/api/admin/verify-session", { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          router.replace("/admin");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.role) sessionStorage.setItem("admin-role", data.role);
        if (data.name) sessionStorage.setItem("admin-name", data.name);
        if (data.role !== "master") router.replace("/admin");
      })
      .catch(() => router.replace("/admin"));
  }, [router]);

  const applySettingsData = useCallback((data: Settings) => {
    setSettings(data);
    setForm({
      businessName: data.businessName,
      businessEmail: data.businessEmail ?? "",
      instagramHandle: data.instagramHandle ?? "",
      defaultDepositAmount: data.defaultDepositAmount ?? undefined,
      defaultPrice: data.defaultPrice ?? undefined,
      openTime: data.openTime ?? "09:00",
      closeTime: data.closeTime ?? "17:00",
      slotInterval: data.slotInterval,
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      smsNotificationFee: data.smsNotificationFee ?? 0.05,
    });
    const primary = data.primaryColor ?? DEFAULT_PRIMARY;
    const secondary = data.secondaryColor ?? DEFAULT_SECONDARY;
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    publishThemeUpdate(primary, secondary);
    setStripeKeysChanged({ secret: false, webhook: false });
  }, []);

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
        if (data) applySettingsData(data);
      })
      .catch(() => {});

    fetch("/api/admin/category-rules", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategoryRules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [hasToken, router, applySettingsData]);

  const save = async () => {
    setSaving(true);
    setSaveMessage(null);

    const payload: Record<string, unknown> = {
      businessName: form.businessName,
      businessEmail: form.businessEmail,
      instagramHandle: form.instagramHandle,
      defaultDepositAmount: form.defaultDepositAmount,
      defaultPrice: form.defaultPrice,
      openTime: form.openTime,
      closeTime: form.closeTime,
      slotInterval: form.slotInterval,
      smsNotificationFee: form.smsNotificationFee,
      primaryColor,
      secondaryColor,
    };

    if (stripeKeysChanged.secret) {
      payload.stripeSecretKey = form.stripeSecretKey === "" ? null : form.stripeSecretKey;
    }
    if (stripeKeysChanged.webhook) {
      payload.stripeWebhookSecret = form.stripeWebhookSecret === "" ? null : form.stripeWebhookSecret;
    }

    try {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        router.replace("/admin");
        return;
      }
      const data = await r.json();
      if (!r.ok) {
        setSaveMessage({ ok: false, message: data.error ?? "Could not save settings" });
        return;
      }

      if (categoryRules.length > 0) {
        await fetch("/api/admin/category-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            rules: categoryRules.map((rule) => ({
              category: rule.category,
              maxConcurrent: rule.maxConcurrent,
            })),
          }),
        });
      }

      applySettingsData(data);
      setSaveMessage({ ok: true, message: "Settings saved." });
      router.refresh();
    } catch {
      setSaveMessage({ ok: false, message: "Save request failed" });
    } finally {
      setSaving(false);
    }
  };

  const themeLabel = useMemo(
    () => findThemePalette(primaryColor, secondaryColor)?.name ?? "Custom",
    [primaryColor, secondaryColor]
  );

  const logout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem("admin-role");
    sessionStorage.removeItem("admin-name");
    router.replace("/admin");
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 focus:border-navy/40 focus:ring-2 focus:ring-navy/10 outline-none bg-white";
  const labelClass = "block text-sm text-charcoal/65 mb-1.5";
  const panelClass = "rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm p-5 sm:p-7 space-y-5";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <Link
          href="/admin"
          className="text-sm text-charcoal/55 hover:text-charcoal transition"
        >
          ← Admin
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/change-password"
            className="text-sm text-charcoal/55 hover:text-charcoal transition px-1"
          >
            Password
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-charcoal/55 hover:text-charcoal transition px-1"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center min-h-[40px] px-5 py-2 rounded-full bg-navy text-white text-sm font-medium hover:bg-navy-light disabled:opacity-50 transition shadow-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-4">Settings</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {form.businessName && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200/90 text-sm text-charcoal/75 shadow-sm">
            {form.businessName}
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200/90 text-sm text-charcoal/75 shadow-sm">
          {themeLabel}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200/90 text-sm text-charcoal/75 shadow-sm">
          {form.openTime ?? "09:00"} – {form.closeTime ?? "17:00"}
        </span>
      </div>

      <div
        className="flex flex-wrap gap-1 p-1 mb-6 rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTab(item.id)}
              className={`flex-1 min-w-[5.5rem] px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation ${
                active
                  ? "bg-navy text-white shadow-sm"
                  : "text-charcoal/65 hover:text-charcoal hover:bg-white/80"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {saveMessage && (
        <p
          className={`mb-4 text-sm text-center ${saveMessage.ok ? "text-green-700" : "text-red-600"}`}
          role="status"
        >
          {saveMessage.message}
        </p>
      )}

      <div className={panelClass} role="tabpanel">
        {tab === "business" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-navy mb-1">Business details</h2>
              <p className="text-sm text-charcoal/55">Name and contact details shown to customers.</p>
            </div>
            <div className="space-y-4">
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
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-sm font-medium text-charcoal">Test notifications</p>
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
                      setTestEmailResult(
                        r.ok
                          ? { ok: true, message: data.message ?? "Sent!" }
                          : { ok: false, message: data.error ?? "Failed" }
                      );
                    } catch {
                      setTestEmailResult({ ok: false, message: "Request failed" });
                    } finally {
                      setTestEmailSending(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
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
                      setSessionCheck(
                        r.ok ? { ok: true, message: "Session OK ✓" } : { ok: false, message: data.error ?? "Failed" }
                      );
                    } catch {
                      setSessionCheck({ ok: false, message: "Request failed" });
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
                >
                  Verify session
                </button>
                <input
                  type="tel"
                  value={testSmsTo}
                  onChange={(e) => setTestSmsTo(e.target.value)}
                  placeholder="07… for test SMS"
                  className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm"
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
                      setTestSmsResult(
                        r.ok
                          ? { ok: true, message: data.message ?? "Sent!" }
                          : { ok: false, message: data.error ?? "Failed" }
                      );
                    } catch {
                      setTestSmsResult({ ok: false, message: "Request failed" });
                    } finally {
                      setTestSmsSending(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  {testSmsSending ? "Sending…" : "Test SMS"}
                </button>
              </div>
              {(testEmailResult || sessionCheck || testSmsResult) && (
                <div className="space-y-1 text-sm">
                  {testEmailResult && (
                    <p className={testEmailResult.ok ? "text-green-700" : "text-red-600"}>
                      Email: {testEmailResult.message}
                    </p>
                  )}
                  {sessionCheck && (
                    <p className={sessionCheck.ok ? "text-green-700" : "text-red-600"}>{sessionCheck.message}</p>
                  )}
                  {testSmsResult && (
                    <p className={testSmsResult.ok ? "text-green-700" : "text-red-600"}>
                      SMS: {testSmsResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "branding" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-navy mb-1">Branding</h2>
              <p className="text-sm text-charcoal/55">
                Colours and gradients for your booking site and admin area.
              </p>
            </div>
            <ThemeEditor
              primary={primaryColor}
              secondary={secondaryColor}
              onChange={(primary, secondary) => {
                setPrimaryColor(primary);
                setSecondaryColor(secondary);
              }}
            />
          </>
        )}

        {tab === "bookings" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-navy mb-1">Bookings</h2>
              <p className="text-sm text-charcoal/55">Pricing, opening hours, and how many clients can book at once.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Open</label>
                <select
                  value={form.openTime ?? "09:00"}
                  onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                  className={inputClass}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
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
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Slot length (min)</label>
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
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="text-sm font-medium text-charcoal">Booking rules</p>
              <p className="text-sm text-charcoal/55">
                Max appointments per category running at the same time.
              </p>
              {categoryRules.length === 0 ? (
                <p className="text-sm text-charcoal/50">Loading rules…</p>
              ) : (
                <div className="space-y-3">
                  {categoryRules.map((rule, i) => (
                    <div key={rule.category} className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-charcoal min-w-[140px]">{rule.label}</span>
                      <label className="text-sm text-charcoal/65">
                        Max at once{" "}
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={rule.maxConcurrent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCategoryRules((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, maxConcurrent: val } : x))
                            );
                          }}
                          className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "payments" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy mb-1">Card payments</h2>
                <p className="text-sm text-charcoal/55">
                  Connect Stripe during setup, or add keys below for manual integration.
                </p>
              </div>
              {settings?.stripeSecretKey && (
                <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1 shrink-0">
                  ✓ Connected
                </span>
              )}
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-navy hover:bg-slate-50 transition"
            >
              Open Stripe dashboard
            </a>
            <button
              type="button"
              onClick={() => setShowStripeKeys((v) => !v)}
              className="block text-sm font-medium text-navy hover:underline"
            >
              {showStripeKeys ? "Hide manual API keys" : "Show manual API keys"}
            </button>
            {showStripeKeys && (
              <div className="space-y-4 pt-2">
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminSettingsPageInner />
    </Suspense>
  );
}
