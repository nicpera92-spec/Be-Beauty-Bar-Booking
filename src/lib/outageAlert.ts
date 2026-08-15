import { Resend } from "resend";
import { formatUKPhoneToE164, sendSMS } from "@/lib/sms";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;

export type OutageAlertState = {
  wasDown: boolean;
  lastDownAlertAt: number;
  cachedEmail: string | null;
};

const globalForAlert = globalThis as unknown as { outageAlert?: OutageAlertState };

export function getOutageAlertState(): OutageAlertState {
  if (!globalForAlert.outageAlert) {
    globalForAlert.outageAlert = { wasDown: false, lastDownAlertAt: 0, cachedEmail: null };
  }
  return globalForAlert.outageAlert;
}

/** Warm instances: at most every 2 hours. Cold starts: only on the hour, so a new lambda does not email every 5 minutes. */
export function shouldSendDownAlert(
  nowMs: number,
  lastDownAlertAt: number,
  utcMinutes: number
): boolean {
  if (lastDownAlertAt > 0) {
    return nowMs - lastDownAlertAt >= COOLDOWN_MS;
  }
  return utcMinutes === 0;
}

export function alertEmailFromEnv(
  env: { [key: string]: string | undefined } = process.env,
  cachedEmail?: string | null
): string | null {
  const fromEnv = env.ALERT_EMAIL?.trim() || env.BUSINESS_EMAIL?.trim() || "";
  if (fromEnv) return fromEnv;
  const cached = cachedEmail?.trim() || "";
  return cached || null;
}

async function sendResend(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("outage alert skipped: RESEND_API_KEY not set");
    return { ok: false as const };
  }
  const from = process.env.EMAIL_FROM || "Be Beauty Bar <onboarding@resend.dev>";
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error("outage alert email failed:", error);
    return { ok: false as const };
  }
  return { ok: true as const };
}

async function sendAlertSms(body: string) {
  const raw = process.env.ALERT_PHONE?.trim();
  if (!raw) return;
  const to = formatUKPhoneToE164(raw);
  await sendSMS(to, body);
}

export async function notifyDatabaseUnreachable(now = new Date()): Promise<boolean> {
  const state = getOutageAlertState();
  state.wasDown = true;
  if (!shouldSendDownAlert(now.getTime(), state.lastDownAlertAt, now.getUTCMinutes())) {
    return false;
  }

  const to = alertEmailFromEnv(process.env, state.cachedEmail);
  if (!to) {
    console.warn("outage alert skipped: set ALERT_EMAIL in Vercel (Production)");
    return false;
  }

  const subject = "Be Beauty Bar — booking site cannot reach the database";
  const text =
    "The booking website cannot reach the database, so customers cannot book and staff may not be able to log in.\n\n" +
    "This is usually a Prisma plan limit or a paused database — not deleted bookings.\n\n" +
    "Check Prisma usage and Vercel Storage for BBBar Booking. Site: https://bbbar.co.uk/api/health";
  const html = `<p>The booking website cannot reach the database, so customers cannot book and staff may not be able to log in.</p>
<p>This is usually a Prisma plan limit or a paused database — not deleted bookings.</p>
<p>Check Prisma usage and Vercel Storage for <strong>BBBar Booking</strong>.</p>
<p><a href="https://bbbar.co.uk/api/health">https://bbbar.co.uk/api/health</a></p>`;

  const sent = await sendResend(to, subject, html, text);
  if (sent.ok) {
    state.lastDownAlertAt = now.getTime();
    await sendAlertSms(
      "Be Beauty Bar: booking site cannot reach the database. Check Prisma / Vercel. https://bbbar.co.uk/api/health"
    ).catch(() => {});
    return true;
  }
  return false;
}

export async function notifyDatabaseRecovered(businessEmail?: string | null): Promise<boolean> {
  const state = getOutageAlertState();
  if (businessEmail?.trim()) {
    state.cachedEmail = businessEmail.trim();
  }
  if (!state.wasDown) return false;
  state.wasDown = false;

  const to = alertEmailFromEnv(process.env, state.cachedEmail);
  if (!to) return false;

  const subject = "Be Beauty Bar — booking site is working again";
  const text =
    "The booking website can reach the database again. Customers should be able to book, and staff can log in.\n\nhttps://bbbar.co.uk/book";
  const html = `<p>The booking website can reach the database again. Customers should be able to book, and staff can log in.</p>
<p><a href="https://bbbar.co.uk/book">https://bbbar.co.uk/book</a></p>`;

  const sent = await sendResend(to, subject, html, text);
  if (sent.ok) {
    await sendAlertSms("Be Beauty Bar: booking site is working again. https://bbbar.co.uk/book").catch(
      () => {}
    );
  }
  return sent.ok;
}
