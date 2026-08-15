import assert from "node:assert/strict";
import { alertEmailFromEnv, shouldSendDownAlert } from "./outageAlert";

assert.equal(shouldSendDownAlert(3_600_000, 0, 7), false, "cold start off the hour does not spam");
assert.equal(shouldSendDownAlert(3_600_000, 0, 0), true, "cold start on the hour can alert");
assert.equal(
  shouldSendDownAlert(1 + 2 * 60 * 60 * 1000, 1, 7),
  true,
  "warm instance alerts after 2 hours"
);
assert.equal(
  shouldSendDownAlert(60 * 60 * 1000, 1, 0),
  false,
  "warm instance respects cooldown"
);

assert.equal(alertEmailFromEnv({ ALERT_EMAIL: " owner@salon.com " }), "owner@salon.com");
assert.equal(
  alertEmailFromEnv({ BUSINESS_EMAIL: "salon@example.com" }),
  "salon@example.com"
);
assert.equal(alertEmailFromEnv({}, "cached@salon.com"), "cached@salon.com");
assert.equal(alertEmailFromEnv({}), null);

console.log("outageAlert: all checks passed");
