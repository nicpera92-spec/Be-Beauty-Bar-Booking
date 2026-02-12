# Environment variables

Set these where your app runs. **Never commit real secrets to Git.**

## Production (Vercel)

In **Vercel** → your project → **Settings** → **Environment Variables**, add for **Production** (and Preview if you use it):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string (e.g. from Vercel Postgres). |
| `ADMIN_SECRET` or `JWT_SECRET` | Yes | Secret for admin login tokens. Keep private. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your live URL (e.g. `https://bbbar.co.uk`). |
| `RESEND_API_KEY` | For email | Resend API key (starts with `re_`) for booking emails. |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key (e.g. `sk_live_...`). |
| `STRIPE_WEBHOOK_SECRET` | For payments | Webhook signing secret (`whsec_...`) for Stripe. |
| **`SMS_WORKS_JWT`** | For SMS | Your token from The SMS Works (Account → API Key → Generate Token). Paste the full token. |
| **`SMS_WORKS_SENDER`** | For SMS | Sender ID, 4–11 alphanumeric (e.g. `BeBeautyBar`). |
| `CRON_SECRET` | For auto-cancel | Secret to protect the cron endpoint that cancels expired deposits. |

After changing any variable, **Redeploy** (Deployments → ⋯ on latest → Redeploy) so the app uses the new values.

## Local (.env)

Copy `.env.example` to `.env` and fill in the same variables for local runs. `.env` is gitignored and is not pushed.
