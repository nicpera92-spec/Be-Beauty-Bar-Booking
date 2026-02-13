# Be Beauty Bar – Beauty Booking Platform

A booking platform for beauty businesses offering **nails**, **lash extensions**, and **permanent makeup**. Customers choose a service, pick a date and time, and request a booking. A deposit is required before the booking is confirmed.

## Features

- **Services**: Nails, lash extensions, permanent makeup — each with custom duration and **customizable deposit** (£).
- **Time slots**: Configurable working hours and slot interval; each service has its own duration.
- **Deposits**: Customers **pay by card** (Stripe) on the website for instant confirmation.
- **Notifications**: Customers choose how to receive updates (email, SMS, or both) when booking. They must provide at least one contact method (email or phone) and select at least one notification method. Notifications are sent for confirmations, cancellations (deposit not paid), and refunds.
- **Admin**: **Business settings** (name, email, Instagram handle for “DM us” on pay-deposit page), **services**, **time off** (block dates or time ranges so they’re unavailable to book), and **bookings** (mark deposit paid, cancel).
- **Auto-cancel**: Bookings with **pending deposit** for over **24 hours** are automatically cancelled. The **customer** and **business owner** receive an email notification.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL="file:./dev.db"` — SQLite (default).
   - `NEXT_PUBLIC_APP_URL` — Your **live site URL** (e.g. `https://your-app.vercel.app`). Used for link previews when shared (e.g. Instagram).
   - `ADMIN_SECRET` — A password for the admin area. Keep this private.
   - **Optional – Pay by card**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. See [Stripe Checkout](https://stripe.com/docs/checkout).
   - **Optional – Confirmation emails**: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Be Beauty Bar <onboarding@resend.dev>`). See [Resend](https://resend.com). Add **Business email** in Admin → Settings so you receive confirmations too.
   - **Optional – Auto-cancel pending deposits**: `CRON_SECRET`. See **Auto-cancel pending deposits** below.

3. **Database**

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

   If you already have a database and pull schema changes, run `npx prisma db push` again. **Time off** now uses date ranges (`startDate`/`startTime` → `endDate`/`endTime`); any existing time-off blocks will be lost and need to be re-added.

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3001](http://localhost:3001). Book at `/book`, admin at `/admin`.

---

## Deploying online (e.g. Vercel)

1. Push your code to **GitHub** (or GitLab/Bitbucket).

2. **Vercel**
   - Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo.
   - Framework: **Next.js** (auto-detected).
   - **Environment variables**: Add `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` (e.g. `https://BBBar.co.uk` or your Vercel URL), and `ADMIN_SECRET`.

3. **Database**: Vercel’s serverless runtime doesn’t keep a local SQLite file. Use one of:
   - **Vercel Postgres** or **Vercel KV** (if you switch the app to use them), or
   - **External DB**: e.g. **PlanetScale**, **Turso**, **Supabase**. Set `DATABASE_URL` in Vercel to your connection string and ensure Prisma uses the right provider (`mysql`, `postgresql`, etc.) in `prisma/schema.prisma`.

4. After deploy, set `NEXT_PUBLIC_APP_URL` to your **production URL** (e.g. `https://your-project.vercel.app`) so link previews work correctly.

---

## Using the link on Instagram

1. **Deploy** the app (see above) and get your live URL, e.g. `https://your-booking.vercel.app`.

2. **Instagram profile link**
   - Instagram → **Profile** → **Edit profile** → **Link**.
   - Paste your booking URL: `https://your-booking.vercel.app` (or `https://your-booking.vercel.app/book` if you prefer to send people straight to **Book**).

3. **Link previews**
   - The app uses **Open Graph** and **Twitter** meta tags. When you or customers share the link (e.g. in DMs, stories, or bio), Instagram and other apps can show a title and description.
   - Ensure `NEXT_PUBLIC_APP_URL` in your deployment matches your **live** URL so previews use the correct domain.

4. **Mobile**
   - The site is responsive and works in Instagram’s in-app browser. Customers can book from their phone via your profile link.

---

## Pay by card (Stripe), confirmation emails (Resend), and SMS (The SMS Works)

- **Stripe**: Create a [Stripe](https://stripe.com) account, get **Secret key** and set `STRIPE_SECRET_KEY`. For **webhooks**, add an endpoint in Stripe Dashboard → Developers → Webhooks → `https://your-domain.com/api/webhooks/stripe`, event `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET`. Locally, use [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3001/api/webhooks/stripe`.
- **Resend (Email)**: Create a [Resend](https://resend.com) account, get an API key, set `RESEND_API_KEY`. Use `EMAIL_FROM` (e.g. `Be Beauty Bar <onboarding@resend.dev>`). Add **Business email** in Admin → Settings so you receive confirmation emails when a booking is confirmed.
- **SMS (The SMS Works)**: Create an account at [The SMS Works](https://thesmsworks.co.uk), generate a token in API Key → Generate Token, and set `SMS_WORKS_JWT` and `SMS_WORKS_SENDER` (4–11 alphanumeric, e.g. `BeBeautyBar`). Customers can choose to receive notifications via SMS, email, or both.

## Customizing deposit amounts

- **Default deposit**: **Admin** → **Business settings** → **Default deposit (£)**. This is used when you add new services.
- **Per service**: **Admin** → **Services** → **Edit** any service → **Deposit (£)**. Each service has its own customizable deposit.

---

## Auto-cancel pending deposits (24h)

If a customer does not pay the deposit within **24 hours**, the booking is automatically **cancelled** and the slot is freed. Both the **customer** and the **business owner** (if **Business email** is set in Admin → Settings) receive an email notification.

**Setup:**

1. Add `CRON_SECRET` to `.env` (e.g. a long random string). Keep it private.
2. Schedule a **cron job** to call the API at least **hourly**:

   - **URL**: `GET` or `POST` `https://your-domain.com/api/cron/cancel-expired-pending-deposits`
   - **Auth**: Either `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`.

3. **Vercel**: Use [Vercel Cron](https://vercel.com/docs/cron-jobs). Add a `vercel.json` cron and set `CRON_SECRET` in project env.
4. **External**: Use [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or similar. Hit the URL above every hour with your secret.

**Resend** must be configured (`RESEND_API_KEY`, `EMAIL_FROM`) for cancellation emails to be sent. If not, bookings are still cancelled but no emails go out.

---

## Scripts

| Command           | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | Run dev server             |
| `npm run build`   | Build for production       |
| `npm run start`   | Run production server      |
| `npm run db:push` | Push Prisma schema to DB   |
| `npm run db:seed` | Seed services & settings   |
