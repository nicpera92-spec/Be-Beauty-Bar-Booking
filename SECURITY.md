# Security

This document describes security measures in place and recommendations to harden the booking platform.

---

## Fixes applied

- **JWT secret in production**: The app no longer falls back to a default secret when `JWT_SECRET` or `ADMIN_SECRET` is unset in production. In production, one of these must be set or the server will throw at startup.
- **Input validation**: Booking creation enforces max lengths (name 200, email 254, phone 30, notes 2000) and validates date (`YYYY-MM-DD`) and time (`HH:mm`) format to reduce abuse and invalid data.
- **Security headers**: Global headers are set:
  - `X-Frame-Options: DENY` – reduces clickjacking
  - `X-Content-Type-Options: nosniff` – prevents MIME sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` – limits referrer leakage
  - `Permissions-Policy` – disables camera, microphone, geolocation

---

## What is already in place

- **Admin auth**: Admin routes require a valid JWT (Bearer token). Tokens are signed with HS256 and expire after 7 days. Passwords are hashed with bcrypt (cost 12).
- **Stripe**: Checkout uses Stripe’s hosted page. Webhooks verify `Stripe-Signature` before processing. No raw card data is handled by the app.
- **Cron**: The “cancel expired deposits” cron is protected by `CRON_SECRET` (Bearer or query param).
- **Booking IDs**: Booking IDs are CUIDs (unguessable), so casual enumeration of `/api/bookings?id=...` is not practical.
- **Database**: Prisma with parameterized queries (no raw SQL concatenation), so SQL injection risk is minimal.
- **No `dangerouslySetInnerHTML`**: User-supplied content is not rendered as HTML, reducing XSS risk.

---

## Recommendations to make the site even more secure

1. **HTTPS only**
   - In production, serve the site only over HTTPS (e.g. Vercel/host enforces HTTPS).
   - Ensure `NEXT_PUBLIC_APP_URL` uses `https://`.

2. **Environment variables**
   - Never commit `.env` or real secrets. Use the host’s env/config (e.g. Vercel Environment Variables).
   - In production set: `JWT_SECRET` or `ADMIN_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `DATABASE_URL`, and any Resend/Twilio keys you use.

3. **Rate limiting**
   - Add rate limiting for:
     - **Admin login** (`POST /api/admin/login`): e.g. max 5 attempts per IP per 15 minutes.
     - **Booking creation** (`POST /api/bookings`): e.g. max 10 per IP per hour.
   - Use your host’s rate limiting, a reverse proxy, or a library (e.g. `@upstash/ratelimit` with Redis) if you add it in-app.

4. **Content Security Policy (CSP)**
   - Add a strict `Content-Security-Policy` header. Start with `default-src 'self'` and allow only required domains (e.g. Stripe, Resend, your domain). Adjust for inline scripts if you use them (e.g. Stripe.js).

5. **Booking lookup (optional extra hardening)**
   - Booking details are returned for `GET /api/bookings?id=<cuid>`. CUIDs are unguessable; the main risk is a leaked link.
   - For extra paranoia: store a short-lived or one-time token per booking and require it in the URL (e.g. `?id=...&token=...`) before returning full details.

6. **Dependencies**
   - Run `npm audit` regularly and fix high/critical issues. Update dependencies and patch known vulnerabilities.

7. **Admin session**
   - Admin token is stored in `sessionStorage` (cleared when the tab closes). For shared computers, ensure admins log out when done.

8. **Database**
   - Use a strong `DATABASE_URL` and restrict DB access (e.g. firewall) to the app and backups only. For SQLite, keep the file permissions strict and back it up securely.

9. **Logging**
   - Avoid logging full request bodies, tokens, or PII. Log only what you need for debugging and monitoring (e.g. booking ID, error type, status codes).

10. **Stripe**
   - Use live keys only in production. Keep webhook signing secret (`STRIPE_WEBHOOK_SECRET`) secret and never expose Stripe secret keys to the client.

---

## Reporting a vulnerability

If you find a security issue, please report it responsibly (e.g. email the site owner or use a private channel) rather than opening a public issue, so it can be fixed before disclosure.
