import assert from "node:assert/strict";
import { toAdminClientSettings, toPublicSettings } from "./publicSettings";

const raw = {
  id: "default",
  businessName: "Be Beauty Bar",
  businessEmail: "salon@example.com",
  adminLoginEmail: "owner@example.com",
  adminPasswordHash: "$2a$12$secret-hash",
  stripeSecretKey: "rk_live_secret",
  stripeWebhookSecret: "whsec_secret",
  openTime: "09:00",
  smsNotificationFee: 0.1,
};

const publicSafe = toPublicSettings(raw);
assert.equal(publicSafe.businessName, "Be Beauty Bar");
assert.equal(publicSafe.smsNotificationFee, 0.1);
assert.equal("adminPasswordHash" in publicSafe, false);
assert.equal("stripeSecretKey" in publicSafe, false);
assert.equal("stripeWebhookSecret" in publicSafe, false);
assert.equal("adminLoginEmail" in publicSafe, false);

const adminSafe = toAdminClientSettings(raw);
assert.equal(adminSafe.stripeSecretKeySet, true);
assert.equal(adminSafe.stripeWebhookSecretSet, true);
assert.equal(adminSafe.businessEmail, "salon@example.com");
assert.equal("adminPasswordHash" in adminSafe, false);
assert.equal("stripeSecretKey" in adminSafe, false);
assert.equal("stripeWebhookSecret" in adminSafe, false);

const emptyKeys = toAdminClientSettings({
  businessName: "Be Beauty Bar",
  stripeSecretKey: null,
  stripeWebhookSecret: "",
});
assert.equal(emptyKeys.stripeSecretKeySet, false);
assert.equal(emptyKeys.stripeWebhookSecretSet, false);

console.log("publicSettings: all checks passed");
