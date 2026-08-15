/** Fields that must never be sent to browsers. */
const SECRET_SETTING_KEYS = [
  "adminPasswordHash",
  "stripeSecretKey",
  "stripeWebhookSecret",
] as const;

type SecretKey = (typeof SECRET_SETTING_KEYS)[number];

export function toPublicSettings<T extends Record<string, unknown>>(settings: T) {
  const copy = { ...settings };
  for (const key of SECRET_SETTING_KEYS) {
    delete copy[key];
  }
  delete copy.adminLoginEmail;
  return copy;
}

export function toAdminClientSettings<T extends Record<string, unknown>>(settings: T) {
  const stripeSecretKey = settings.stripeSecretKey;
  const stripeWebhookSecret = settings.stripeWebhookSecret;
  const copy = { ...settings };
  for (const key of SECRET_SETTING_KEYS) {
    delete copy[key as SecretKey];
  }
  return {
    ...copy,
    stripeSecretKeySet: Boolean(stripeSecretKey),
    stripeWebhookSecretSet: Boolean(stripeWebhookSecret),
  };
}
