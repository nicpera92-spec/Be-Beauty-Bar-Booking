"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeEditor from "@/components/ThemeEditor";
import NotificationMessagesEditor from "@/components/NotificationMessagesEditor";
import { DEFAULT_NOTIFICATION_MESSAGES, type NotificationMessages } from "@/lib/notificationDefaults";
import { resolveNotificationMessages } from "@/lib/notificationTemplates";
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/lib/themePalettes";
import { publishThemeUpdate } from "@/lib/themeClient";

const ADMIN_TOKEN_KEY = "admin-token";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
}

type SettingsTab = "business" | "theme" | "bookings" | "messages" | "payments";

const TABS: { id: SettingsTab; label: string; shortLabel: string }[] = [
  { id: "business", label: "Business", shortLabel: "Business" },
  { id: "theme", label: "Theme", shortLabel: "Theme" },
  { id: "bookings", label: "Bookings", shortLabel: "Bookings" },
  { id: "messages", label: "Messages", shortLabel: "Msgs" },
  { id: "payments", label: "Payments", shortLabel: "Pay" },
];

function isSettingsTab(value: string | null): value is SettingsTab {
  return (
    value === "business" ||
    value === "theme" ||
    value === "bookings" ||
    value === "messages" ||
    value === "payments"
  );
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!t) return {};
  return { Authorization: `Bearer ${t}`, "X-Admin-Token": t };
}

function SettingsInfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-charcoal/20 text-[10px] font-semibold leading-none text-charcoal/45 hover:border-navy/35 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/15 touch-manipulation"
        aria-label="More information"
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <span
            role="tooltip"
            className="absolute left-1/2 top-full z-40 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-normal normal-case leading-snug text-charcoal/70 shadow-md sm:w-64"
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
}

function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors touch-manipulation ${
        checked ? "bg-navy" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsFeatureRow({
  label,
  info,
  checked,
  onChange,
  children,
}: {
  label: string;
  info: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-charcoal">{label}</span>
          <SettingsInfoTip text={info} />
        </div>
        <SettingsToggle checked={checked} onChange={onChange} label={label} />
      </div>
      {children && checked && <div className="mt-2.5 pt-2 border-t border-slate-200/70">{children}</div>}
    </div>
  );
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
  notificationMessages?: unknown;
  waitlistEnabled?: boolean;
  rebookReminderEnabled?: boolean;
  rebookReminderDaysAfter?: number;
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
  const [notificationMessages, setNotificationMessages] = useState<NotificationMessages>(
    DEFAULT_NOTIFICATION_MESSAGES
  );
  const [waitlistPreviewSending, setWaitlistPreviewSending] = useState(false);
  const [waitlistPreviewResult, setWaitlistPreviewResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [rebookPreviewSending, setRebookPreviewSending] = useState(false);
  const [rebookPreviewResult, setRebookPreviewResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "branding") {
      setTab("theme");
      router.replace("/admin/settings?tab=theme", { scroll: false });
      return;
    }
    if (isSettingsTab(tabParam)) setTab(tabParam);
  }, [searchParams, router]);

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
      waitlistEnabled: data.waitlistEnabled ?? true,
      rebookReminderEnabled: data.rebookReminderEnabled ?? false,
      rebookReminderDaysAfter: data.rebookReminderDaysAfter ?? 21,
    });
    const primary = data.primaryColor ?? DEFAULT_PRIMARY;
    const secondary = data.secondaryColor ?? DEFAULT_SECONDARY;
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setNotificationMessages(resolveNotificationMessages(data.notificationMessages));
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
      waitlistEnabled: form.waitlistEnabled ?? true,
      rebookReminderEnabled: form.rebookReminderEnabled ?? false,
      rebookReminderDaysAfter: form.rebookReminderDaysAfter ?? 21,
      primaryColor,
      secondaryColor,
      notificationMessages,
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

  const previewWaitlistEmail = async () => {
    setWaitlistPreviewSending(true);
    setWaitlistPreviewResult(null);
    try {
      const saveR = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ notificationMessages }),
      });
      if (!saveR.ok) {
        const err = await saveR.json();
        setWaitlistPreviewResult({
          ok: false,
          message: err.error ?? "Save messages before previewing",
        });
        return;
      }

      const r = await fetch("/api/admin/test-waitlist-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      setWaitlistPreviewResult({
        ok: r.ok,
        message: r.ok ? data.message : data.error ?? "Could not send preview",
      });
    } catch {
      setWaitlistPreviewResult({ ok: false, message: "Preview request failed" });
    } finally {
      setWaitlistPreviewSending(false);
    }
  };

  const previewRebookEmail = async () => {
    setRebookPreviewSending(true);
    setRebookPreviewResult(null);
    try {
      const saveR = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ notificationMessages }),
      });
      if (!saveR.ok) {
        const err = await saveR.json();
        setRebookPreviewResult({
          ok: false,
          message: err.error ?? "Save messages before previewing",
        });
        return;
      }

      const r = await fetch("/api/admin/test-rebook-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      setRebookPreviewResult({
        ok: r.ok,
        message: r.ok ? data.message : data.error ?? "Could not send preview",
      });
    } catch {
      setRebookPreviewResult({ ok: false, message: "Preview request failed" });
    } finally {
      setRebookPreviewSending(false);
    }
  };

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
  const compactLabelClass = "block text-xs text-charcoal/55 mb-1";
  const panelClass = "rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm p-5 sm:p-7 space-y-5";
  const compactInputClass =
    "w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/30";

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

      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal mb-6">Settings</h1>

      <div
        className="flex flex-nowrap gap-0.5 sm:gap-1 p-1 mb-6 w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm"
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
              className={`flex-1 min-w-0 px-1 sm:px-3 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium transition touch-manipulation truncate ${
                active
                  ? "bg-navy text-white shadow-sm"
                  : "text-charcoal/65 hover:text-charcoal hover:bg-white/80"
              }`}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
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

        {tab === "theme" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-navy mb-1">Theme</h2>
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
              <h2 className="text-lg font-semibold text-navy mb-0.5">Bookings</h2>
              <p className="text-sm text-charcoal/55">Pricing, hours, and booking limits.</p>
            </div>

            <div className="space-y-2">
              <SettingsFeatureRow
                label="Waiting list"
                info="Let customers join a waiting list on fully booked days and notify them when a slot opens."
                checked={form.waitlistEnabled ?? true}
                onChange={(waitlistEnabled) => setForm((f) => ({ ...f, waitlistEnabled }))}
              />

              <SettingsFeatureRow
                label="Rebook reminders"
                info="Send a polite email or text inviting customers back after their last visit. Uses the same email or text choice they picked when they booked. If they rebook sooner, the timer resets from their new appointment. Checked once a day — customers who rebook within that time are not reminded until the same number of days after their next visit. Customers can opt out after the first reminder."
                checked={form.rebookReminderEnabled ?? false}
                onChange={(rebookReminderEnabled) =>
                  setForm((f) => ({ ...f, rebookReminderEnabled }))
                }
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs text-charcoal/60">Days after last visit</span>
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={form.rebookReminderDaysAfter ?? 21}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rebookReminderDaysAfter: Math.min(
                          365,
                          Math.max(7, Number(e.target.value) || 21)
                        ),
                      }))
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                  <span className="text-xs text-charcoal/45">days (7–365)</span>
                </div>
              </SettingsFeatureRow>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-charcoal">Pricing &amp; hours</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className={compactLabelClass}>Default price (£)</label>
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
                    className={compactInputClass}
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className={compactLabelClass}>Default deposit (£)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.defaultDepositAmount ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        defaultDepositAmount:
                          e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={compactInputClass}
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className={compactLabelClass}>SMS fee (£)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.smsNotificationFee ?? 0.05}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        smsNotificationFee:
                          e.target.value === "" ? 0.05 : parseFloat(e.target.value) || 0.05,
                      }))
                    }
                    className={compactInputClass}
                    placeholder="0.05"
                  />
                </div>
                <div>
                  <label className={compactLabelClass}>Open</label>
                  <select
                    value={form.openTime ?? "09:00"}
                    onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                    className={compactInputClass}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={compactLabelClass}>Close</label>
                  <select
                    value={form.closeTime ?? "17:00"}
                    onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                    className={compactInputClass}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={compactLabelClass}>Slot length (min)</label>
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
                    className={compactInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-charcoal">Booking rules</p>
                <SettingsInfoTip text="Maximum number of appointments per category that can run at the same time." />
              </div>
              {categoryRules.length === 0 ? (
                <p className="text-sm text-charcoal/50">Loading rules…</p>
              ) : (
                <div className="space-y-2">
                  {categoryRules.map((rule, i) => (
                    <div
                      key={rule.category}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/30 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-charcoal">{rule.label}</span>
                      <label className="flex items-center gap-1.5 text-xs text-charcoal/65">
                        Max at once
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
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "messages" && (
          <NotificationMessagesEditor
            messages={notificationMessages}
            onChange={setNotificationMessages}
            onPreviewWaitlist={previewWaitlistEmail}
            previewSending={waitlistPreviewSending}
            previewResult={waitlistPreviewResult}
            onPreviewRebook={previewRebookEmail}
            rebookPreviewSending={rebookPreviewSending}
            rebookPreviewResult={rebookPreviewResult}
          />
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
