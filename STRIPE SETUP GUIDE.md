# Stripe Setup Guide

This guide will walk you through connecting your Stripe account to enable card payments on your booking platform.

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click **"Sign up"** or **"Start now"**
3. Create your account (you'll need to provide business details)
4. Complete the account setup process

## Step 2: Get Your Stripe API Keys

### For Testing (Development)

1. After logging into Stripe, make sure you're in **Test mode** (toggle in the top right)
2. Go to **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (starts with `pk_test_...`) - Not needed for this setup
   - **Secret key** (starts with `sk_test_...`) - **Copy this!**

### For Production (Live Site)

1. Switch to **Live mode** (toggle in the top right)
2. Go to **Developers** → **API keys**
3. Copy the **Secret key** (starts with `sk_live_...`)

⚠️ **Important**: Never share your secret keys publicly. Keep them secure!

## Step 3: Add Keys to Your Project

1. Open the `.env` file in your project root (create it if it doesn't exist)
2. Add your Stripe secret key:

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
```

**For production**, use your live key:
```env
STRIPE_SECRET_KEY=sk_live_your_key_here
```

## Step 4: Set Up Webhooks (For Production)

Webhooks allow Stripe to notify your website when a payment is completed.

### For Production (Live Site):

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/webhooks/stripe
   ```
   (Replace `your-domain.com` with your actual website URL)
4. Select the event: **`checkout.session.completed`**
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### For Local Testing (Development):

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
4. Copy the webhook signing secret that appears (starts with `whsec_...`)
5. Add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_local_webhook_secret_here
```

## Step 5: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to your booking page and create a test booking
3. Try to pay the deposit
4. Use Stripe's test card numbers:
   - **Card number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/34`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)

5. After payment, check:
   - The booking should be marked as "Confirmed"
   - You should receive a confirmation email (if Resend is set up)

## Step 6: Deploy to Production

When you deploy your site (e.g., to Vercel):

1. Add environment variables in your hosting platform:
   - `STRIPE_SECRET_KEY` (use your **live** key: `sk_live_...`)
   - `STRIPE_WEBHOOK_SECRET` (from your production webhook endpoint)
   - `NEXT_PUBLIC_APP_URL` (your live website URL)

2. Set up the webhook endpoint in Stripe Dashboard pointing to your live URL

## Troubleshooting

### "Pay by card is not configured"
- Make sure `STRIPE_SECRET_KEY` is set in your `.env` file
- Restart your development server after adding the key

### Payment succeeds but booking doesn't confirm
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify the webhook endpoint is configured in Stripe Dashboard
- Check your server logs for webhook errors

### Webhook errors
- Make sure your webhook URL is correct
- Verify the webhook secret matches what's in Stripe Dashboard
- For local testing, make sure Stripe CLI is running

## Need Help?

- Stripe Documentation: [https://stripe.com/docs](https://stripe.com/docs)
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)
