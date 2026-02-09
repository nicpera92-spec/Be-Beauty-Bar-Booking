# How to Set Up SMS Notifications (Twilio)

This guide will help you set up SMS/text message notifications for your booking system.

## ⚠️ Important: SMS Costs Money

**SMS is not free** because phone carriers charge for text messages. However:
- **Twilio offers a free trial** with credit to test (usually $15-20 worth)
- After the trial, it costs around **£0.01-0.05 per SMS** in the UK
- **Email notifications are completely free** (already set up with Resend)

**Recommendation:** Start with email notifications (free). Add SMS later if customers specifically request it.

---

## Step 1: Create a Twilio Account

1. Go to **https://www.twilio.com**
2. Click **"Sign up"** (top right)
3. Fill in your details:
   - Email address
   - Password
   - Phone number (for verification)
4. Verify your email and phone number when prompted
5. You'll be asked a few questions about what you're building - just say "SMS notifications" or "text messaging"

---

## Step 2: Get Your Twilio Phone Number

1. After signing up, you'll be taken to the Twilio Console (dashboard)
2. In the left menu, click **"Phone Numbers"** → **"Manage"** → **"Buy a number"**
3. Click **"Buy a number"** button
4. Select your country (e.g., **United Kingdom**)
5. For "Capabilities", make sure **"SMS"** is checked
6. Click **"Search"**
7. Choose a phone number from the list (they're free for trial accounts)
8. Click **"Buy"** and confirm

**Important:** Write down this phone number! It will look like `+447123456789` (with the +44 country code).

---

## Step 3: Get Your Account Credentials

1. In the Twilio Console, look at the top right corner
2. You'll see your **Account SID** (starts with `AC...`) - click to copy it
3. Below that, you'll see your **Auth Token** - click the eye icon to reveal it, then copy it

**Important:** Keep these secret! Don't share them publicly.

---

## Step 4: Add Credentials to Your Project

1. Open the file `.env` in your project folder (if it doesn't exist, create it)
2. Add these three lines (replace with YOUR actual values):

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+447123456789
```

**Example (use your own values from the Twilio Console):**
- `TWILIO_ACCOUNT_SID=` your Account SID from Twilio
- `TWILIO_AUTH_TOKEN=` your Auth Token from Twilio
- `TWILIO_PHONE_NUMBER=` the number you bought (e.g. +447123456789)

3. Save the file

---

## Step 5: Restart Your App

1. Close the "Run the app.bat" window if it's running
2. Double-click **"Run the app.bat"** again
3. Wait for it to say "Ready"

---

## Step 6: Test It!

1. Go to your booking site: **http://localhost:3001**
2. Make a test booking:
   - Choose a service
   - Select a date and time
   - Enter your name
   - Enter your **phone number** (the one you want to receive SMS on)
   - Check the **"SMS (text message)"** checkbox
   - Complete the booking
3. Pay the deposit
4. You should receive an SMS confirmation!

---

## Important Notes

### Trial Account Limits
- Twilio trial accounts can only send SMS to **verified phone numbers**
- To verify a number: Twilio Console → Phone Numbers → Verified Caller IDs → Add a new number
- For production, you'll need to upgrade to a paid account (but trial is free to test)

### Costs
- Twilio charges per SMS (usually around £0.01-0.05 per message in the UK)
- Trial accounts get a small credit to start
- You can set spending limits in Twilio Console → Settings → General

### Phone Number Format
- Always include the country code (e.g., `+44` for UK)
- The system automatically formats UK numbers (e.g., `07123 456789` becomes `+447123456789`)

---

## Troubleshooting

**"SMS not configured" error:**
- Check your `.env` file has all three Twilio variables
- Make sure there are no spaces around the `=` sign
- Restart the app after adding the variables

**No SMS received:**
- Check your phone number is correct in the booking
- Verify your phone number in Twilio Console (for trial accounts)
- Check Twilio Console → Monitor → Logs for any errors

**"Invalid phone number" error:**
- Make sure the phone number includes country code (e.g., `+44`)
- Remove any spaces or special characters

---

## Need Help?

- **Twilio Support:** https://support.twilio.com
- **Twilio Docs:** https://www.twilio.com/docs
- **Check your Twilio Console:** https://console.twilio.com (look at Logs for errors)

---

That's it! Once set up, customers who choose SMS notifications will receive text messages for:
- Booking confirmations
- Booking cancellations (if deposit not paid)
- Refunds (if applicable)
