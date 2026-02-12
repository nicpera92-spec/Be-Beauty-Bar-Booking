/**
 * SMS via The SMS Works (https://thesmsworks.co.uk).
 * We use their "Option 2": HTTP POST to https://api.thesmsworks.co.uk/v1/message/send
 * from the application (no SDK or Postman required). Customers who choose SMS when booking
 * receive texts when their booking is confirmed or cancelled.
 * Set either:
 *   - SMS_WORKS_JWT: the token from your account (API Key tab → Generate Token), or
 *   - SMS_WORKS_API_KEY + SMS_WORKS_API_SECRET: we'll generate a JWT from these.
 * Also set SMS_WORKS_SENDER: sender ID (4–11 alphanumeric, e.g. BeBeautyBar). UK networks restrict some words.
 */
const SMS_WORKS_API = "https://api.thesmsworks.co.uk/v1/message/send";

async function getSmsWorksAuthHeader(): Promise<string | null> {
  const jwt = process.env.SMS_WORKS_JWT?.trim();
  if (jwt) {
    return jwt.startsWith("JWT ") ? jwt : `JWT ${jwt}`;
  }

  const apiKey = process.env.SMS_WORKS_API_KEY?.trim();
  const apiSecret = process.env.SMS_WORKS_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;

  try {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(apiSecret);
    const token = await new SignJWT({})
      .setSubject(apiKey)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("365d")
      .sign(secret);
    return `JWT ${token}`;
  } catch (e) {
    console.error("SMS Works JWT generation failed:", e);
    return null;
  }
}

function getSender(): string {
  const sender = process.env.SMS_WORKS_SENDER?.trim();
  if (sender && /^[a-zA-Z0-9]{4,11}$/.test(sender)) return sender;
  return "BeBeautyBar";
}

/**
 * Send an SMS message via The SMS Works.
 * @param to Phone number (E.164 format, e.g. +447123456789)
 * @param message Message text (GSM charset up to 160 chars; longer or Unicode uses more credits)
 * @returns { ok: boolean, error?: string }
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await getSmsWorksAuthHeader();
  if (!auth) {
    console.warn("SMS Works not configured: set SMS_WORKS_JWT or SMS_WORKS_API_KEY + SMS_WORKS_API_SECRET.");
    return { ok: false, error: "SMS not configured" };
  }

  // API expects destination without + (e.g. 44777777777)
  const destination = to.replace(/^\++/, "");

  const body = {
    sender: getSender(),
    destination,
    content: message,
  };

  try {
    const res = await fetch(SMS_WORKS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } })() : {};
    if (!res.ok) {
      const errMsg = (data as { message?: string }).message ?? (data as { error?: string }).error ?? (text || `HTTP ${res.status}`);
      console.error("SMS Works send failed:", errMsg);
      return { ok: false, error: String(errMsg) };
    }
    return { ok: true };
  } catch (e) {
    console.error("sendSMS error:", e);
    return { ok: false, error: String(e) };
  }
}

export function formatUKPhoneToE164(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "44" + digits.slice(1);
  } else if (!digits.startsWith("44") && digits.length <= 10) {
    digits = "44" + digits;
  }
  return digits ? "+" + digits : "";
}
