"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBookingDate, formatMadeAt } from "@/lib/format";

const ADMIN_TOKEN_KEY = "admin-token";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type Reminded = {
  bookingId: string;
  customerName: string;
  contact: string;
  serviceName: string;
  visitDate: string;
  sentAt: string;
  bookedAfterDate: string | null;
  bookedAfterMadeOn: string | null;
};

type Data = {
  enabled: boolean;
  daysAfter: number;
  today: string;
  waiting: Reminded[];
  rebooked: Reminded[];
  rebookedShownDays: number;
  waitingShownDays: number;
};

const day = (d: string) => formatBookingDate(d, "EEE d MMM yyyy");
const when = (iso: string) => formatBookingDate(iso.slice(0, 10), "d MMM yyyy");

function Section({ title, hint, tone, children }: { title: string; hint?: string; tone: "navy" | "green" | "grey"; children: React.ReactNode }) {
  const colour = tone === "green" ? "text-emerald-700" : tone === "navy" ? "text-navy" : "text-charcoal/70";
  return (
    <section>
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-1 ${colour}`}>{title}</h2>
      {hint && <p className="text-xs text-charcoal/55 mb-3">{hint}</p>}
      {children}
    </section>
  );
}

export default function RebookRemindersPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
      router.replace("/admin");
      return;
    }
    fetch("/api/admin/rebook-reminders", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error ?? "Could not load");
        setData(body);
      })
      .catch((e) => setError(e?.message ?? "Could not load"));
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">Rebook reminders</h1>
        <Link
          href="/admin/settings"
          className="text-sm text-charcoal/70 hover:text-navy px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          ← Settings
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-charcoal/60">Loading…</p>}

      {data && (
        <div className="space-y-10">
          <p className="text-sm text-charcoal/65 leading-relaxed">
            Reminders are <strong>{data.enabled ? "on" : "off"}</strong> and go out at 9am,{" "}
            <strong>{data.daysAfter} days</strong> after a customer&apos;s most recent visit — only if they
            have no later booking (matched by email or phone, including bookings still awaiting a deposit).
            This is checked again the moment before each reminder is sent.
          </p>

          <Section
            title={`Rebooked after their reminder (${data.rebooked.length})`}
            tone="green"
            hint={`Shown for ${data.rebookedShownDays} days after they book, then removed from this page.`}
          >
            {data.rebooked.length === 0 ? (
              <p className="text-sm text-charcoal/55">Nobody has rebooked in the last {data.rebookedShownDays} days.</p>
            ) : (
              <div className="space-y-2">
                {data.rebooked.map((s) => (
                  <div key={s.bookingId} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-medium text-charcoal">
                        {s.customerName} <span className="font-normal text-charcoal/55">· {s.contact}</span>
                      </p>
                      <p className="text-xs text-emerald-700 font-medium">Rebooked</p>
                    </div>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      Reminded {formatMadeAt(s.sentAt)} after {s.serviceName} on {day(s.visitDate)}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Booked for {day(s.bookedAfterDate!)}
                      {s.bookedAfterMadeOn && ` · booked on ${formatMadeAt(s.bookedAfterMadeOn)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title={`Reminded — not rebooked yet (${data.waiting.length})`}
            tone="navy"
            hint={`Reminders sent in the last ${data.waitingShownDays} days where the customer hasn't booked again. Older ones drop off this list.`}
          >
            {data.waiting.length === 0 ? (
              <p className="text-sm text-charcoal/55">Nobody is waiting to rebook.</p>
            ) : (
              <div className="space-y-2">
                {data.waiting.map((s) => (
                  <div key={s.bookingId} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-medium text-charcoal">
                        {s.customerName} <span className="font-normal text-charcoal/55">· {s.contact}</span>
                      </p>
                      <p className="text-xs text-charcoal/55">Reminded {when(s.sentAt)}</p>
                    </div>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      Last visit: {s.serviceName} on {day(s.visitDate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
