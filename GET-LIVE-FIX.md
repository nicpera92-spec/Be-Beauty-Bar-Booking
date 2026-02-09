# Why your edits aren’t live and how to fix it

## What’s going wrong

- **Flicker after paying deposit** – The live site is still using the old flow (redirect to booking page with `?paid=1` instead of the “Deposit confirmed” page).
- **No emails** – Either the new code isn’t deployed, or `RESEND_API_KEY` / Business email aren’t set in the live environment.
- **No refund button** – The admin page with refunds is in the new code; the live site is still on an old deployment.

So: **production is almost certainly still running an old deployment.** New builds may have been failing, so Vercel never switched production to the latest code.

---

## Step 1: Get a successful build and make it Production

1. Open **[Vercel Dashboard](https://vercel.com)** → your project **be-beauty-bar-booking**.
2. Go to **Deployments**.
3. Check the **top** deployment (most recent):
   - If it says **Ready** – note the **commit** (e.g. `12ee90b` or `e7b77cd`). If that commit is recent (e.g. “Stripe checkout: use only card+paypal” or “Calendar and time slots”), go to **Step 4**.
   - If it says **Error** – click it, open **Build Logs**, and copy the **first red error** (e.g. file and line). Fix that error in code, push again, then repeat from Step 1.
4. If the latest deployment is **Ready** but the live site still behaves like the old one:
   - Click that deployment → **⋯** (three dots) → **Promote to Production** (or **Set as Production**).
   - Your domain (e.g. bbbar.co.uk) will then serve this deployment.

---

## Step 2: Confirm the new code is live

- Open **https://bbbar.co.uk** (or your live URL).
- Scroll to the **footer**. You should see something like **“Build 12ee90b”** (or another 7-character commit).
- If you see **“Build xxxxxxx”**, the new code is live. If there is no “Build …” line, you’re still on an old deployment — go back to Step 1 and promote the latest **Ready** deployment.

---

## Step 3: Emails on the live site

1. **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add (or fix):
   - **`RESEND_API_KEY`** = your Resend API key (starts with `re_`).
   - **`NEXT_PUBLIC_APP_URL`** = `https://bbbar.co.uk` (optional but recommended).
3. **Save** and **Redeploy** (Deployments → ⋯ on latest → Redeploy) so the new env vars are used.
4. In your app: **Admin** → **Settings** → set **Business email** and click **Send test email**. If that works, booking/confirmation emails will work too.

---

## Step 4: Stripe webhook (so “Deposit confirmed” and status updates work)

1. **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://bbbar.co.uk/api/webhooks/stripe`
3. **Events:** select **checkout.session.completed**.
4. After saving, open the endpoint and copy the **Signing secret** (`whsec_...`).
5. **Vercel** → **Settings** → **Environment Variables** → add **`STRIPE_WEBHOOK_SECRET`** = that signing secret (or set it in **Admin** → **Settings** → Stripe Webhook secret if your app reads it from the DB).
6. **Redeploy** again so the new secret is used.

After this, when a customer pays the deposit, Stripe will call your app, the booking will be marked confirmed, and they’ll be redirected to the “Deposit confirmed” page (no flicker). Refund buttons in admin will show for bookings that have a Stripe payment (new payments after this is set up).

---

## Step 5: Refund button

- Refund buttons appear in **Admin** for bookings that **paid online** (deposit or balance) and have **not** been refunded yet.
- **Existing bookings** created or marked “deposit paid” before the new code + webhook were live won’t have a Stripe payment ID, so they won’t show “Refund deposit”. **New** deposits paid after the webhook is set up will show the refund button.

---

## Quick checklist

- [ ] Latest deployment in Vercel is **Ready** (not Error).
- [ ] That deployment is **Promoted to Production**.
- [ ] Live site footer shows **“Build xxxxxxx”**.
- [ ] **RESEND_API_KEY** (and optionally **NEXT_PUBLIC_APP_URL**) set in Vercel; **Business email** set in Admin; test email works.
- [ ] **Stripe webhook** added for `https://bbbar.co.uk/api/webhooks/stripe`, **checkout.session.completed**, and **STRIPE_WEBHOOK_SECRET** set in Vercel (or in Admin Stripe settings).
- [ ] One **Redeploy** after changing env vars so the running app uses them.
