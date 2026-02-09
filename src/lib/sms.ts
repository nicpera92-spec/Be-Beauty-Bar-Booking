/** SMS via Twilio. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    // Lazy import Twilio only if credentials are present
    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch (e) {
    console.error("Failed to initialize Twilio:", e);
    return null;
  }
}

/**
 * Send an SMS message.
 * @param to Phone number (E.164 format, e.g. +447123456789)
 * @param message Message text
 * @returns { ok: boolean, error?: string }
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getTwilioClient();
  if (!client) {
    console.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set; skipping SMS.");
    return { ok: false, error: "SMS not configured" };
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn("TWILIO_PHONE_NUMBER not set; skipping SMS.");
    return { ok: false, error: "SMS phone number not configured" };
  }

  try {
    await client.messages.create({
      body: message,
      from,
      to,
    });
    return { ok: true };
  } catch (e) {
    console.error("sendSMS error:", e);
    return { ok: false, error: String(e) };
  }
}

export function formatUKPhoneToE164(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with +44
  if (digits.startsWith("0")) {
    digits = "+44" + digits.slice(1);
  } else if (!digits.startsWith("+")) {
    // If no country code, assume UK and add +44
    digits = "+44" + digits;
  }

  return digits;
}
