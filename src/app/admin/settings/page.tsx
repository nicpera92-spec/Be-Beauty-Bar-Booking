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

type Settings = {
  businessName: string;
  businessEmail?: string | null;
  instagramHandle?: string | null;
  defaultDepositAmount?: number | null;
  defaultPrice?: number | null;
  openHour: number;
  closeHour: number;
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

  useEffect(() => {
    setHasToken(!!sessionStorage.getItem(ADMIN_TOKEN_KEY));
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
        if (data) {
          setSettings(data);
          setForm({
            businessName: data.businessName,
            businessEmail: data.businessEmail ?? "",
            instagramHandle: data.instagramHandle ?? "",
            defaultDepositAmount: data.defaultDepositAmount ?? undefined,
            defaultPrice: data.defaultPrice ?? undefined,
            openHour: data.openHour,
            closeHour: data.closeHour,
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
    // Build payload - only include Stripe keys if they've been changed
    const payload: Partial<Settings> = {
      businessName: form.businessName,
      businessEmail: form.businessEmail,
      instagramHandle: form.instagramHandle,
      defaultDepositAmount: form.defaultDepositAmount,
      defaultPrice: form.defaultPrice,
      openHour: form.openHour,
      closeHour: form.closeHour,
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
            openHour: data.openHour,
            closeHour: data.closeHour,
            slotInterval: data.slotInterval,
            stripeSecretKey: "", // Always start empty for security (password field)
            stripeWebhookSecret: "", // Always start empty for security (password field)
            smsNotificationFee: data.smsNotificationFee ?? 0.05,
          });
          setStripeKeysChanged({ secret: false, webhook: false });
        }
      })
      .finally(() => setSaving(false));
  };

  if (hasToken === null) return null;
  if (!hasToken) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/admin" className="text-sm text-sky-600 hover:underline mb-6 inline-block">
        ← Back to admin
      </Link>
      <h1 className="font-serif text-2xl font-semibold text-charcoal mb-8">
        Business settings
      </h1>

      <form onSubmit={save} className="space-y-6">
        <section>
          <h2 className="font-medium text-charcoal mb-3">Business</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">Business name</label>
              <input
                type="text"
                value={form.businessName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">
                Business email (for confirmation emails)
              </label>
              <input
                type="email"
                value={form.businessEmail ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                placeholder="you@bebeautybar.com"
              />
              <p className="text-xs text-charcoal/50 mt-1">
                You and the customer receive emails when a booking is <strong>created</strong> and when it is <strong>confirmed</strong> (after deposit). Fill this in to get admin copies.
              </p>
              <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
                <strong>Not receiving emails?</strong> 1) Set <code className="bg-amber-100 px-0.5">RESEND_API_KEY</code> in Vercel (or .env). 2) In Resend, verify your domain if you use a custom &quot;from&quot; address; otherwise use <code className="bg-amber-100 px-0.5">onboarding@resend.dev</code> for testing.
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                  {testEmailSending ? "Sending…" : "Send test email"}
                </button>
                {testEmailResult && (
                  <span className={`text-sm ${testEmailResult.ok ? "text-green-700" : "text-red-600"}`}>
                    {testEmailResult.message}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-charcoal/70 mb-1">
                <strong>Test SMS (SMS Works)</strong>
              </p>
              <p className="text-xs text-charcoal/50 mb-2">
                Set <code className="bg-amber-100 px-0.5">SMS_WORKS_JWT</code> and <code className="bg-amber-100 px-0.5">SMS_WORKS_SENDER</code> in Vercel (or .env). Then enter a UK mobile (07…) and click Send to verify booking SMS works.
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <input
                  type="tel"
                  value={testSmsTo}
                  onChange={(e) => setTestSmsTo(e.target.value)}
                  placeholder="07..."
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
                  {testSmsSending ? "Sending…" : "Send test SMS"}
                </button>
                {testSmsResult && (
                  <span className={`text-sm ${testSmsResult.ok ? "text-green-700" : "text-red-600"}`}>
                    {testSmsResult.message}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">
                Instagram handle (optional)
              </label>
              <input
                type="text"
                value={form.instagramHandle ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                placeholder="e.g. bebeautybar (without @)"
              />
              <p className="text-xs text-charcoal/50 mt-1">
                Shown on the pay-deposit page: &quot;For questions or issues, DM us on Instagram.&quot;
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-medium text-charcoal mb-3">Pricing & deposits</h2>
          <p className="text-sm text-charcoal/60 mb-3">
            Set default <strong>full price</strong> and <strong>deposit</strong> (£) for new services.
            Override per service in{" "}
            <Link href="/admin/services" className="text-sky-600 hover:underline">
              Services
            </Link>
            . Deposit must be ≤ full price.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">
                Default full price (£)
              </label>
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">
                Default deposit (£)
              </label>
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
                placeholder="e.g. 20"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-charcoal/70 mb-1">
              SMS notification fee (£)
            </label>
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
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              placeholder="0.05"
            />
            <p className="text-xs text-charcoal/60 mt-1">
              This fee will be added to the deposit when customers choose SMS notifications. Default: £0.05
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-medium text-charcoal mb-3">Availability (time slots)</h2>
          <p className="text-sm text-charcoal/60 mb-3">
            Working hours and slot interval. Slots are generated within these hours.
            Each service has its own duration.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">Open (hour)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.openHour ?? 9}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openHour: parseInt(e.target.value, 10) || 9 }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">Close (hour)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.closeHour ?? 17}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    closeHour: parseInt(e.target.value, 10) || 17,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-charcoal/70 mb-1">
                Slot interval (min)
              </label>
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 outline-none bg-white"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
          <h2 className="font-medium text-charcoal mb-1">Accept card payments</h2>
          <p className="text-sm text-slate-600 mb-5">
            Connect Stripe so customers can pay deposits and remaining balance by card. Free to sign up.
          </p>

          {settings?.stripeSecretKey ? (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-800">
              <span className="text-lg" aria-hidden>✓</span>
              <span className="text-sm font-medium">Stripe connected. Customers can pay by card.</span>
            </div>
          ) : null}

          <div className="space-y-5">
            <div>
              <a
                href="https://dashboard.stripe.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#635bff] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5851ea] transition mb-4"
              >
                Sign up or log in to Stripe
              </a>
              <p className="text-sm text-slate-600 mb-3">
                In Stripe: go to <strong>Developers</strong> → <strong>API keys</strong>, copy your <strong>Secret key</strong>, and paste it below.
              </p>
              <label className="block text-sm text-charcoal/80 mb-1.5">Stripe Secret key</label>
              <input
                type="password"
                value={form.stripeSecretKey ?? ""}
                onChange={(e) => {
                  setForm((f) => ({ ...f, stripeSecretKey: e.target.value }));
                  setStripeKeysChanged((prev) => ({ ...prev, secret: true }));
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none bg-white font-mono text-sm"
                placeholder={settings?.stripeSecretKey ? "Leave empty to keep current, or paste a new key" : "Paste your key here (sk_...)"}
              />
            </div>

            <div className="border-t border-slate-200 pt-5">
              <p className="text-xs text-slate-500 mb-2">Going live? Add your webhook secret later.</p>
              <label
                className="block text-sm text-charcoal/80 mb-1.5 cursor-help"
                title="When your site is live, Stripe sends your site a notification each time a payment completes. The webhook secret is a code that proves those notifications really come from Stripe, so your site can safely mark the booking as confirmed. Only needed once your site is online."
              >
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
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 outline-none bg-white font-mono text-sm"
                placeholder={settings?.stripeWebhookSecret ? "Leave empty to keep current" : "Optional — skip until you go live"}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-900 text-white py-3 rounded-full font-medium hover:bg-black disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
