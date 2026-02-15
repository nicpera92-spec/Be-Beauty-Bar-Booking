# 24-Hour Reminder – Email & SMS Preview

Below is exactly what customers will receive 24 hours before their appointment.

---

## Email

**Subject:** `Reminder: your appointment tomorrow – Be Beauty Bar`

**Body:**

```
Appointment reminder

Hi [Customer Name],

This is a friendly reminder that you have an appointment with us tomorrow:

• Service: [Service name]
• Date: [e.g. Friday, 14 February 2026]
• Time: [e.g. 11:00 – 13:00]

We look forward to seeing you!

— Be Beauty Bar
```

---

## SMS

**Message (example for "John" with "Classic Manicure" on 15/02 at 11:00):**

```
Hi John! Just a reminder – your Classic Manicure appointment at Be Beauty Bar is tomorrow 15/02 at 11:00. See you soon!
```

*(~95 characters – fits in one SMS segment)*

---

## When it sends

- **Email:** If the customer chose email notifications when booking
- **SMS:** If the customer chose SMS notifications when booking
- **Both:** If they chose both
- **Neither:** If they chose neither (no reminder sent)

The cron runs every hour and sends to customers whose appointment starts in approximately 23–25 hours.
