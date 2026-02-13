# One-time setup: your single Vercel project (bbbar.co.uk)

Use **one** Vercel project: **be-beauty-bar-booking** (the one with domain **bbbar.co.uk**).  
If you still have **be-beauty-bar-booking-a8hq**, delete it (Settings → Delete Project) so you’re not maintaining two projects.

---

## 1. Connect repo (if needed)

- **Vercel** → **be-beauty-bar-booking** → **Settings** → **Git**
- Connected repository should be: **nicpera92-spec/Be-Beauty-Bar-Booking**
- Production branch: **main**

---

## 2. Environment variables (set once)

**Vercel** → **be-beauty-bar-booking** → **Settings** → **Environment Variables**

Add these for **Production** (and **Preview** if you use preview URLs). Use the same values for both unless you have a reason not to.

| Variable | Value | Notes |
|----------|--------|--------|
| **DATABASE_URL** | Your Postgres URL | From Vercel Postgres or your DB provider. Must start with `postgresql://` or `postgres://`. |
| **ADMIN_SECRET** | A strong secret you choose | Used for admin login. Keep private. Can use `JWT_SECRET` instead. |
| **NEXT_PUBLIC_APP_URL** | `https://bbbar.co.uk` | Your live site URL. |
| **RESEND_API_KEY** | `re_...` | From Resend, for booking/confirmation emails. |
| **EMAIL_FROM** | e.g. `Be Beauty Bar <onboarding@resend.dev>` | Sender for emails (or your verified domain). |
| **STRIPE_SECRET_KEY** | `sk_live_...` or `sk_test_...` | From Stripe. |
| **STRIPE_WEBHOOK_SECRET** | `whsec_...` | From Stripe webhook for `https://bbbar.co.uk/api/webhooks/stripe`. |
| **SMS_WORKS_API_KEY** | Your Key from SMS Works | From “Generate a New API Key & Secret” (the Key). |
| **SMS_WORKS_API_SECRET** | Your Secret from SMS Works | From the same section (the Secret). |
| **SMS_WORKS_SENDER** | `BeBeautyBar` (or your ID) | 4–11 alphanumeric. |
| **CRON_SECRET** | A secret you choose | Only if you call the cron endpoint to auto-cancel expired deposits. |

**SMS:** Use **either** `SMS_WORKS_JWT` **or** `SMS_WORKS_API_KEY` + `SMS_WORKS_API_SECRET`. Don’t set both. For Key+Secret, leave `SMS_WORKS_JWT` unset. If you get "SMS Works: Unauthorized", try `SMS_WORKS_AUTH_STYLE` = `raw` or `jwt`. See `scripts/test-sms-works-curl.md` to test your token with cURL.

---

## 3. After saving env vars

- Go to **Deployments** → open the latest deployment → **⋯** → **Redeploy** (so the app picks up the new variables).
- Wait until the deployment is **Ready**.

---

## 4. Quick checks

- Open **https://bbbar.co.uk** and confirm the site loads.
- **Admin** → log in → **Settings** → **Send test email** and **Send test SMS** (UK mobile) to confirm email and SMS.
- Place a test booking and pay deposit; confirm confirmation email/SMS if you use them.

---

## 5. If you had two projects

- Env vars are **per project**. So set the variables only on **be-beauty-bar-booking** (bbbar.co.uk).
- After deleting **be-beauty-bar-booking-a8hq**, all traffic and config live in the one project.

No code changes are required for this; it’s configuration only. All updates are already pushed to **main**; the one project will deploy from that branch.
