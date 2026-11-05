export type NotificationMessages = {
  bookingCreatedCustomerSubject: string;
  bookingCreatedCustomerBody: string;
  bookingCreatedOwnerSubject: string;
  bookingCreatedOwnerBody: string;
  bookingConfirmedCustomerSubject: string;
  bookingConfirmedCustomerBody: string;
  bookingConfirmedCustomerSms: string;
  bookingConfirmedOwnerSubject: string;
  bookingConfirmedOwnerBody: string;
  manualCancelCustomerSubject: string;
  manualCancelCustomerBody: string;
  manualCancelCustomerSms: string;
  manualCancelOwnerSubject: string;
  manualCancelOwnerBody: string;
  customerCancelCustomerSubject: string;
  customerCancelCustomerBody: string;
  customerCancelCustomerSms: string;
  customerCancelOwnerSubject: string;
  customerCancelOwnerBody: string;
  rescheduleCustomerSubject: string;
  rescheduleCustomerBody: string;
  rescheduleCustomerSms: string;
  rescheduleOwnerSubject: string;
  rescheduleOwnerBody: string;
  depositExpiredCustomerSubject: string;
  depositExpiredCustomerBody: string;
  depositExpiredCustomerSms: string;
  depositExpiredOwnerSubject: string;
  depositExpiredOwnerBody: string;
  reminderCustomerSubject: string;
  reminderCustomerBody: string;
  reminderCustomerSms: string;
  waitlistCustomerSubject: string;
  waitlistCustomerBody: string;
  waitlistCustomerSms: string;
  rebookReminderCustomerSubject: string;
  rebookReminderCustomerBody: string;
  rebookReminderCustomerSms: string;
  reviewRequestCustomerSubject: string;
  reviewRequestCustomerBody: string;
  reviewRequestCustomerSms: string;
  giftCertificateRecipientSubject: string;
  giftCertificateRecipientBody: string;
  giftCertificateBuyerSubject: string;
  giftCertificateBuyerBody: string;
  giftCertificateOwnerSubject: string;
  giftCertificateOwnerBody: string;
  dailyScheduleSubject: string;
  dailyScheduleBody: string;
};

export const DEFAULT_NOTIFICATION_MESSAGES: NotificationMessages = {
  bookingCreatedCustomerSubject: "Booking request received – **Salon name**",
  bookingCreatedCustomerBody: `Hi **Customer name**,

We've received your booking. Please pay your deposit within 24 hours to confirm your appointment.

Service: **Service**
Date: **Date**
Time: **Time**

Pay your deposit here: **Pay deposit link**

— **Salon name**`,

  bookingCreatedOwnerSubject: "New booking request – **Customer name**",
  bookingCreatedOwnerBody: `A customer has requested a booking. They need to pay the deposit within 24 hours to confirm.

Customer: **Customer name**
Service: **Service**
Date: **Date**
Time: **Time**

— **Salon name**`,

  bookingConfirmedCustomerSubject: "Booking confirmed – **Salon name**",
  bookingConfirmedCustomerBody: `Hi **Customer name**,

Your deposit has been received. Here are your booking details:

Service: **Service**
Date: **Date**
Time: **Time**

We look forward to seeing you!

Add it to your calendar: **Calendar link**

Find us: **Directions link**

Need to change or cancel? Up to 48 hours before your appointment you can move it up to twice to another day or time, or cancel with a full deposit refund. Cancellations within 48 hours of your appointment are non-refundable. Each booking can only be cancelled once.

Change or cancel your booking: **Cancel link**

See all your bookings: **My bookings link**

— **Salon name**`,
  bookingConfirmedCustomerSms:
    "Hi **Customer name**, your booking at **Salon name** is confirmed. **Service** on **Date** at **Time**. We look forward to seeing you! Cancel here: **Cancel link** (deposit non-refundable within 48hrs) Your bookings: **My bookings link**",

  bookingConfirmedOwnerSubject: "Booking confirmed – **Customer name**",
  bookingConfirmedOwnerBody: `A deposit has been received.

Customer: **Customer name**
Service: **Service**
Date: **Date**
Time: **Time**

— **Salon name**`,

  manualCancelCustomerSubject: "Booking cancelled – **Salon name**",
  manualCancelCustomerBody: `Hi **Customer name**,

Your booking has been cancelled. If you have any questions, please contact us.

Service: **Service**
Date: **Date**
Time: **Time**

— **Salon name**`,
  manualCancelCustomerSms:
    "Hi **Customer name**, your booking at **Salon name** has been cancelled. **Service** on **Date** at **Time**. If you have questions, please contact us.",

  manualCancelOwnerSubject: "Booking cancelled – **Customer name**",
  manualCancelOwnerBody: `A booking was cancelled.

Customer: **Customer name**
Service: **Service**
Date: **Date**
Time: **Time**

— **Salon name**`,

  customerCancelCustomerSubject: "Your booking has been cancelled – **Salon name**",
  customerCancelCustomerBody: `Hi **Customer name**,

Your booking has been cancelled as requested.

Service: **Service**
Date: **Date**
Time: **Time**

**Refund details**

We're sorry we won't see you this time and hope to see you again soon.

Book again: **Booking link**

— **Salon name**`,
  customerCancelCustomerSms:
    "Hi **Customer name**, your **Service** booking at **Salon name** on **Date** at **Time** has been cancelled. **Refund details** We hope to see you again soon: **Booking link**",

  customerCancelOwnerSubject: "Customer cancelled – **Customer name**",
  customerCancelOwnerBody: `A customer cancelled their booking using the link in their confirmation.

Customer: **Customer name**
Service: **Service**
Date: **Date**
Time: **Time**

Refund: **Refund details**

— **Salon name**`,

  rescheduleCustomerSubject: "Your appointment has been moved – **Salon name**",
  rescheduleCustomerBody: `Hi **Customer name**,

Your appointment has been moved. Here are your new booking details:

Service: **Service**
Date: **Date**
Time: **Time**

(Previously **Previous date** at **Previous time**.)

Your deposit has been carried over. **Moves left**

Add it to your calendar: **Calendar link**

Find us: **Directions link**

Need to cancel? You can still use the same link as before.

Cancel your booking: **Cancel link**

— **Salon name**`,
  rescheduleCustomerSms:
    "Hi **Customer name**, your **Service** at **Salon name** is now on **Date** at **Time**. Your deposit has been carried over. See you then!",

  rescheduleOwnerSubject: "Booking moved – **Customer name**",
  rescheduleOwnerBody: `A customer moved their booking using the link in their confirmation.

Customer: **Customer name**
Service: **Service**
New date: **Date**
New time: **Time**
Previously: **Previous date** at **Previous time**

— **Salon name**`,

  depositExpiredCustomerSubject: "Booking cancelled – **Salon name**",
  depositExpiredCustomerBody: `Hi **Customer name**,

Your booking was automatically cancelled because the deposit was not paid within 24 hours.

Service: **Service**
Date: **Date**
Time: **Time**

If you'd still like to book, please visit our booking page.

— **Salon name**`,
  depositExpiredCustomerSms:
    "Hi **Customer name**, your booking at **Salon name** was cancelled because the deposit wasn't paid in time. **Service** on **Date** at **Time**. To rebook, visit our booking page.",

  depositExpiredOwnerSubject: "Booking auto-cancelled (deposit not paid) – **Customer name**",
  depositExpiredOwnerBody: `A booking was automatically cancelled because the deposit was not paid within 24 hours.

Customer: **Customer name**
Service: **Service**
Date: **Date**
Time: **Time**

— **Salon name**`,

  reminderCustomerSubject: "Reminder: your appointment tomorrow – **Salon name**",
  reminderCustomerBody: `Hi **Customer name**,

This is a friendly reminder that you have an appointment with us tomorrow:

Service: **Service**
Date: **Date**
Time: **Time**

Find us: **Directions link**

We look forward to seeing you!

— **Salon name**`,
  reminderCustomerSms:
    "Hi **Customer name**! Just a reminder – your **Service** appointment at **Salon name** is tomorrow **Date** at **Time**. Find us: **Directions link** See you soon!",

  waitlistCustomerSubject: "Good news — a slot has opened on **Date** at **Salon name**",
  waitlistCustomerBody: `Hi **Customer name**,

Great news — a slot has opened on **Date** for **Service** with **Technician**.

Book now: **Booking link**

Slots aren't held, so please book as soon as you can and choose a time that suits you.

We hope to see you soon!

— **Salon name**`,
  waitlistCustomerSms:
    "Hi **Customer name**! A **Service** slot opened on **Date** at **Salon name**. Book now: **Booking link**",

  rebookReminderCustomerSubject: "We would love to see you again at **Salon name**",
  rebookReminderCustomerBody: `Hi **Customer name**,

We hope you enjoyed your **Service** with **Technician** when you visited us on **Date**.

It has been a little while since your last appointment, and we would love to welcome you back. If you would like to rebook with us, you can do so here:

**Booking link**

We look forward to seeing you again!

— **Salon name**

If you would rather not receive rebook reminders from us in future, you can opt out here: **Opt out link**`,
  rebookReminderCustomerSms:
    "Hi **Customer name**, we hope you enjoyed your **Service** with **Technician** at **Salon name**. Would you like to rebook? **Booking link** To stop rebook reminders: **Opt out link**",

  reviewRequestCustomerSubject: "How was your visit to **Salon name**?",
  reviewRequestCustomerBody: `Hi **Customer name**,

Thank you for visiting us for your **Service** with **Technician** — we hope you love the results!

If you have a minute, we'd be so grateful for a quick Google review. It really helps a small business like ours.

Leave a review: **Review link**

— **Salon name**`,
  reviewRequestCustomerSms:
    "Hi **Customer name**, thank you for visiting **Salon name**! If you have a minute, we'd love a quick Google review: **Review link**",

  giftCertificateRecipientSubject: "**Buyer name** has sent you a gift certificate for **Salon name**",
  giftCertificateRecipientBody: `Hi **Recipient name**,

**Buyer name** has treated you to a gift certificate for **Salon name**!

**Gift message**

Your treat:
**Treatments**

It's already paid for in full — there's nothing to pay at your appointment.

Your certificate code: **Certificate code**

To use it, book your treatment online and enter the code on the last step. Valid until **Certificate expiry**.

Book now: **Booking link**

— **Salon name**`,

  giftCertificateBuyerSubject: "Your gift certificate for **Recipient name** – **Salon name**",
  giftCertificateBuyerBody: `Hi **Buyer name**,

Thank you for buying a gift certificate for **Recipient name**. We've emailed it to them with your message.

Treatments:
**Treatments**

Certificate code: **Certificate code**
Valid until **Certificate expiry**

— **Salon name**`,

  giftCertificateOwnerSubject: "Gift certificate sold – **Certificate value**",
  giftCertificateOwnerBody: `A **Certificate value** gift certificate was bought online by **Buyer name** (**Buyer email**) for **Recipient name**.

Treatments:
**Treatments**

Certificate code: **Certificate code**
Valid until **Certificate expiry**

— **Salon name**`,

  dailyScheduleSubject: "Tomorrow: **Appointment count** – **Date**",
  dailyScheduleBody: `Hi **Technician**,

Here's the schedule for **Date** (**Appointment count**):

**Schedule**

— **Salon name**`,
};

export type NotificationMessageField = {
  key: keyof NotificationMessages;
  label: string;
  kind: "subject" | "email" | "sms";
};

export type NotificationMessageSection = {
  title: string;
  fields: NotificationMessageField[];
};

export type NotificationMessageGroup = {
  id: string;
  title: string;
  description: string;
  sections: NotificationMessageSection[];
};

export const NOTIFICATION_MESSAGE_GROUPS: NotificationMessageGroup[] = [
  {
    id: "booking-request",
    title: "Booking request",
    description: "When a customer requests a slot and needs to pay a deposit.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "bookingCreatedCustomerSubject", label: "Subject", kind: "subject" },
          { key: "bookingCreatedCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Your email",
        fields: [
          { key: "bookingCreatedOwnerSubject", label: "Subject", kind: "subject" },
          { key: "bookingCreatedOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "booking-confirmed",
    title: "Booking confirmed",
    description:
      "When a deposit is received and the booking is confirmed. The customer email and text always include their cancel link.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "bookingConfirmedCustomerSubject", label: "Subject", kind: "subject" },
          { key: "bookingConfirmedCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "bookingConfirmedCustomerSms", label: "Message", kind: "sms" }],
      },
      {
        title: "Your email",
        fields: [
          { key: "bookingConfirmedOwnerSubject", label: "Subject", kind: "subject" },
          { key: "bookingConfirmedOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "manual-cancel",
    title: "Booking cancelled (by you)",
    description: "When you cancel a booking from the admin.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "manualCancelCustomerSubject", label: "Subject", kind: "subject" },
          { key: "manualCancelCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "manualCancelCustomerSms", label: "Message", kind: "sms" }],
      },
      {
        title: "Your email",
        fields: [
          { key: "manualCancelOwnerSubject", label: "Subject", kind: "subject" },
          { key: "manualCancelOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "customer-cancel",
    title: "Booking cancelled (by customer)",
    description:
      "When a customer cancels using the link in their confirmation. Refund details explain whether their deposit was refunded (48+ hours' notice) or kept.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "customerCancelCustomerSubject", label: "Subject", kind: "subject" },
          { key: "customerCancelCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "customerCancelCustomerSms", label: "Message", kind: "sms" }],
      },
      {
        title: "Your email",
        fields: [
          { key: "customerCancelOwnerSubject", label: "Subject", kind: "subject" },
          { key: "customerCancelOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "customer-reschedule",
    title: "Booking moved (by customer)",
    description:
      "When a customer moves their appointment using their confirmation link (allowed once, before the free-cancellation window closes).",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "rescheduleCustomerSubject", label: "Subject", kind: "subject" },
          { key: "rescheduleCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "rescheduleCustomerSms", label: "Message", kind: "sms" }],
      },
      {
        title: "Your email",
        fields: [
          { key: "rescheduleOwnerSubject", label: "Subject", kind: "subject" },
          { key: "rescheduleOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "deposit-expired",
    title: "Deposit not paid",
    description: "When a booking is auto-cancelled after 24 hours without a deposit.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "depositExpiredCustomerSubject", label: "Subject", kind: "subject" },
          { key: "depositExpiredCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "depositExpiredCustomerSms", label: "Message", kind: "sms" }],
      },
      {
        title: "Your email",
        fields: [
          { key: "depositExpiredOwnerSubject", label: "Subject", kind: "subject" },
          { key: "depositExpiredOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "reminder",
    title: "Appointment reminder",
    description: "Sent 24 hours before a confirmed appointment.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "reminderCustomerSubject", label: "Subject", kind: "subject" },
          { key: "reminderCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "reminderCustomerSms", label: "Message", kind: "sms" }],
      },
    ],
  },
  {
    id: "waitlist",
    title: "Waiting list",
    description: "When a slot opens on a date someone is waiting for.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "waitlistCustomerSubject", label: "Subject", kind: "subject" },
          { key: "waitlistCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "waitlistCustomerSms", label: "Message", kind: "sms" }],
      },
    ],
  },
  {
    id: "rebook-reminder",
    title: "Rebook reminder",
    description:
      "Sent after a customer's most recent visit if they have not booked again. Uses their last booking's email/text preference. Timing is set in Bookings settings.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "rebookReminderCustomerSubject", label: "Subject", kind: "subject" },
          { key: "rebookReminderCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "rebookReminderCustomerSms", label: "Message", kind: "sms" }],
      },
    ],
  },
  {
    id: "review-request",
    title: "Review request",
    description:
      "Sent the day after an appointment asking for a Google review (at most once every 90 days per customer). Turn on and add your review link in Bookings settings.",
    sections: [
      {
        title: "Customer email",
        fields: [
          { key: "reviewRequestCustomerSubject", label: "Subject", kind: "subject" },
          { key: "reviewRequestCustomerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Customer text",
        fields: [{ key: "reviewRequestCustomerSms", label: "Message", kind: "sms" }],
      },
    ],
  },
  {
    id: "gift-voucher",
    title: "Gift certificate",
    description:
      "When a gift certificate is bought online (or one you create in the salon is emailed). The gift email always includes the buyer's personal message. If the buyer chose to give it themselves, the gift email goes to them instead and no receipt is sent.",
    sections: [
      {
        title: "Gift email (to the person it's for)",
        fields: [
          { key: "giftCertificateRecipientSubject", label: "Subject", kind: "subject" },
          { key: "giftCertificateRecipientBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Buyer receipt",
        fields: [
          { key: "giftCertificateBuyerSubject", label: "Subject", kind: "subject" },
          { key: "giftCertificateBuyerBody", label: "Message", kind: "email" },
        ],
      },
      {
        title: "Your email",
        fields: [
          { key: "giftCertificateOwnerSubject", label: "Subject", kind: "subject" },
          { key: "giftCertificateOwnerBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
  {
    id: "daily-schedule",
    title: "Daily schedule (to staff)",
    description:
      "Sent at 7pm to each technician with bookings the next day. You (the owner) get the whole salon's schedule, grouped by technician.",
    sections: [
      {
        title: "Staff email",
        fields: [
          { key: "dailyScheduleSubject", label: "Subject", kind: "subject" },
          { key: "dailyScheduleBody", label: "Message", kind: "email" },
        ],
      },
    ],
  },
];
