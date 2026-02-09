# Email Notifications Preview

This document shows what the email notifications look like when sent to customers and the business owner.

---

## 1. Booking Confirmation Email (to Customer)

**Subject:** `Booking confirmed – Be Beauty Bar`

**Email Content:**

---

**Your booking is confirmed**

Hi Sarah,

Your deposit has been received. Here are your booking details:

- **Service:** Classic Lash Extensions
- **Date:** Monday, 3 February 2026
- **Time:** 10:00 – 12:00

We look forward to seeing you!

— Be Beauty Bar

---

## 2. Booking Confirmation Email (to Business Owner)

**Subject:** `New booking confirmed – Sarah`

**Email Content:**

---

**Booking confirmed**

A deposit has been received. Booking details:

- **Customer:** Sarah
- **Email:** sarah@example.com
- **Phone:** 07123 456789
- **Notifications:** Email + SMS
- **Service:** Classic Lash Extensions
- **Date:** Monday, 3 February 2026
- **Time:** 10:00 – 12:00

— Be Beauty Bar booking system

---

## 3. Cancellation Email (to Customer - Deposit Not Paid)

**Subject:** `Booking cancelled – Be Beauty Bar`

**Email Content:**

---

**Your booking has been cancelled**

Hi Sarah,

Your booking was automatically cancelled because the deposit was not paid within 24 hours.

Details of the cancelled booking:

- **Service:** Classic Lash Extensions
- **Date:** Monday, 03/02/2026
- **Time:** 10:00 – 12:00

If you'd still like to book, please visit our booking page and complete your deposit within 24 hours of requesting a slot.

— Be Beauty Bar

---

## 4. Cancellation Email (to Business Owner - Deposit Not Paid)

**Subject:** `Booking auto-cancelled (deposit not paid) – Sarah`

**Email Content:**

---

**Booking auto-cancelled**

A booking was automatically cancelled because the deposit was not paid within 24 hours.

- **Customer:** Sarah
- **Email:** sarah@example.com
- **Phone:** 07123 456789
- **Notifications:** Email + SMS
- **Service:** Classic Lash Extensions
- **Date:** Monday, 03/02/2026
- **Time:** 10:00 – 12:00

— Be Beauty Bar booking system

---

## Notes

- **Email formatting:** The emails use simple HTML formatting (headings, paragraphs, lists)
- **Business name:** Uses the business name from Admin → Business settings (defaults to "Be Beauty Bar")
- **Date format:** 
  - Customer confirmation: "Monday, 3 February 2026" (full format)
  - Cancellation: "Monday, 03/02/2026" (dd/MM/yyyy format)
- **Conditional sending:** 
  - Customer emails only sent if they selected "Email" notifications
  - Business owner emails only sent if "Business email" is set in Admin → Settings
- **From address:** Uses `EMAIL_FROM` from `.env` (e.g., "Be Beauty Bar <onboarding@resend.dev>")

---

## SMS Notifications (for comparison)

If customers select SMS notifications, they receive:

**Confirmation SMS:**
```
Hi Sarah, your booking at Be Beauty Bar is confirmed. Classic Lash Extensions on 03/02/2026 at 10:00-12:00. We look forward to seeing you!
```

**Cancellation SMS:**
```
Hi Sarah, your booking at Be Beauty Bar was cancelled because the deposit wasn't paid within 24 hours. Classic Lash Extensions on 03/02/2026 at 10:00-12:00. To rebook, visit our booking page.
```
