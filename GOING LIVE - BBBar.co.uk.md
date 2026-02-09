
# Going live with BBBar.co.uk

Use this checklist when you deploy your booking site to **BBBar.co.uk**.

---

## 1. Set your domain in the app

In your **hosting** (e.g. Vercel, your server), set this environment variable:

```env
NEXT_PUBLIC_APP_URL=https://BBBar.co.uk
```

- Use `https://www.BBBar.co.uk` only if you want the site to live at **www**. Then use that same URL everywhere below.
- This is used for: Stripe success/cancel redirects, link previews (Open Graph), and metadata.

---

## 2. Point your domain to your hosting (DNS)

Where you bought **BBBar.co.uk** (e.g. 123-reg, GoDaddy, Cloudflare), add DNS records so the domain points to your app:

| If you use… | What to do |
|-------------|------------|
| **Vercel** | In Vercel: Project → **Settings** → **Domains** → Add `BBBar.co.uk` (and optionally `www.BBBar.co.uk`). Vercel will show the exact DNS records (usually an **A** record or **CNAME**) to add at your domain registrar. |
| **Other host** | Add an **A** record pointing to your host’s IP, or a **CNAME** to their hostname (e.g. `your-app.vercel.app`). |

After DNS propagates (can take a few minutes to 48 hours), visiting **https://BBBar.co.uk** will load your site.

---

## 3. Stripe (payments)

1. **Stripe Dashboard** → [Developers → Webhooks](https://dashboard.stripe.com/webhooks).
2. **Add endpoint**: URL = `https://BBBar.co.uk/api/webhooks/stripe`, events = e.g. `checkout.session.completed`, `payment_intent.succeeded` (match what your app expects).
3. Copy the **Signing secret** and set it in your hosting as `STRIPE_WEBHOOK_SECRET`.
4. If Stripe has a “allowed origins/domains” setting for Checkout, add `https://BBBar.co.uk`.
5. For live payments, use **live** keys (`sk_live_...`, `pk_live_...`) in production, not test keys.

---

## 4. Optional: HTTPS and www

- **HTTPS**: Vercel and most hosts provide HTTPS automatically once the domain is connected.
- **www vs non-www**: Decide whether the main URL is `https://BBBar.co.uk` or `https://www.BBBar.co.uk`. Set `NEXT_PUBLIC_APP_URL` to that exact URL and, if you use Vercel, add both domains and set the preferred one as primary.

---

## 5. Auto-cancel unpaid deposits (24 hours)

If the deposit is not paid within 24 hours, the booking is automatically cancelled. This requires:

1. Set `CRON_SECRET` in your host (e.g. a random string like `abc123xyz`)
2. On **Vercel**: The cron is configured in `vercel.json` and runs every hour automatically
3. On **other hosts**: Call `GET /api/cron/cancel-expired-pending-deposits` with `Authorization: Bearer <CRON_SECRET>` every hour (e.g. via cron-job.org)

---

## 6. After go-live

- Open **https://BBBar.co.uk** and **https://BBBar.co.uk/book** to confirm the booking flow.
- Do a test booking and pay a deposit to confirm Stripe and emails work.
- Update your **Instagram** (or other) link to `https://BBBar.co.uk` or `https://BBBar.co.uk/book`.

---

**Summary:** Set `NEXT_PUBLIC_APP_URL=https://BBBar.co.uk` in your host, point BBBar.co.uk to that host via DNS, then add the Stripe webhook URL and live keys. The app is already set up to use your domain once those are in place.
