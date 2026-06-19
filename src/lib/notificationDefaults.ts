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
};

export const DEFAULT_NOTIFICATION_MESSAGES: NotificationMessages = {
  bookingCreatedCustomerSubject: "Booking request received – {{businessName}}",
  bookingCreatedCustomerBody: `Hi {{customerName}},

We've received your booking. Please pay your deposit within 24 hours to confirm your appointment.

Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

Pay your deposit here: {{depositLink}}

— {{businessName}}`,

  bookingCreatedOwnerSubject: "New booking request – {{customerName}}",
  bookingCreatedOwnerBody: `A customer has requested a booking. They need to pay the deposit within 24 hours to confirm.

Customer: {{customerName}}
Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

— {{businessName}}`,

  bookingConfirmedCustomerSubject: "Booking confirmed – {{businessName}}",
  bookingConfirmedCustomerBody: `Hi {{customerName}},

Your deposit has been received. Here are your booking details:

Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

We look forward to seeing you!

— {{businessName}}`,
  bookingConfirmedCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} is confirmed. {{serviceName}} on {{date}} at {{time}}. We look forward to seeing you!",

  bookingConfirmedOwnerSubject: "Booking confirmed – {{customerName}}",
  bookingConfirmedOwnerBody: `A deposit has been received.

Customer: {{customerName}}
Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

— {{businessName}}`,

  manualCancelCustomerSubject: "Booking cancelled – {{businessName}}",
  manualCancelCustomerBody: `Hi {{customerName}},

Your booking has been cancelled. If you have any questions, please contact us.

Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

— {{businessName}}`,
  manualCancelCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} has been cancelled. {{serviceName}} on {{date}} at {{time}}. If you have questions, please contact us.",

  manualCancelOwnerSubject: "Booking cancelled – {{customerName}}",
  manualCancelOwnerBody: `A booking was cancelled.

Customer: {{customerName}}
Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

— {{businessName}}`,

  depositExpiredCustomerSubject: "Booking cancelled – {{businessName}}",
  depositExpiredCustomerBody: `Hi {{customerName}},

Your booking was automatically cancelled because the deposit was not paid within 24 hours.

Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

If you'd still like to book, please visit our booking page.

— {{businessName}}`,
  depositExpiredCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} was cancelled because the deposit wasn't paid in time. {{serviceName}} on {{date}} at {{time}}. To rebook, visit our booking page.",

  depositExpiredOwnerSubject: "Booking auto-cancelled (deposit not paid) – {{customerName}}",
  depositExpiredOwnerBody: `A booking was automatically cancelled because the deposit was not paid within 24 hours.

Customer: {{customerName}}
Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

— {{businessName}}`,

  reminderCustomerSubject: "Reminder: your appointment tomorrow – {{businessName}}",
  reminderCustomerBody: `Hi {{customerName}},

This is a friendly reminder that you have an appointment with us tomorrow:

Service: {{serviceName}}
Date: {{date}}
Time: {{time}}

We look forward to seeing you!

— {{businessName}}`,
  reminderCustomerSms:
    "Hi {{customerName}}! Just a reminder – your {{serviceName}} appointment at {{businessName}} is tomorrow {{date}} at {{time}}. See you soon!",

  waitlistCustomerSubject: "Good news — a slot has opened at {{businessName}}",
  waitlistCustomerBody: `Hi {{customerName}},

Great news — a time has become available for {{serviceName}} with {{technicianName}}:

Date: {{date}}
Time: {{time}}

Book this slot now: {{bookLink}}

Slots aren't held, so please book as soon as you can. First to complete their booking gets the appointment.

We hope to see you soon!

— {{businessName}}`,
  waitlistCustomerSms:
    "Hi {{customerName}}! A {{serviceName}} slot opened at {{businessName}} on {{date}} at {{time}}. Book now: {{bookLink}}",
};

export type NotificationMessageGroup = {
  id: string;
  title: string;
  description: string;
  fields: {
    key: keyof NotificationMessages;
    label: string;
    kind: "subject" | "email" | "sms";
  }[];
};

export const NOTIFICATION_MESSAGE_GROUPS: NotificationMessageGroup[] = [
  {
    id: "booking-request",
    title: "Booking request",
    description: "When a customer requests a slot and needs to pay a deposit.",
    fields: [
      { key: "bookingCreatedCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "bookingCreatedCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "bookingCreatedOwnerSubject", label: "Your email — subject", kind: "subject" },
      { key: "bookingCreatedOwnerBody", label: "Your email — message", kind: "email" },
    ],
  },
  {
    id: "booking-confirmed",
    title: "Booking confirmed",
    description: "When a deposit is received and the booking is confirmed.",
    fields: [
      { key: "bookingConfirmedCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "bookingConfirmedCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "bookingConfirmedCustomerSms", label: "Customer text message", kind: "sms" },
      { key: "bookingConfirmedOwnerSubject", label: "Your email — subject", kind: "subject" },
      { key: "bookingConfirmedOwnerBody", label: "Your email — message", kind: "email" },
    ],
  },
  {
    id: "manual-cancel",
    title: "Booking cancelled (by you)",
    description: "When you cancel a booking from the admin.",
    fields: [
      { key: "manualCancelCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "manualCancelCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "manualCancelCustomerSms", label: "Customer text message", kind: "sms" },
      { key: "manualCancelOwnerSubject", label: "Your email — subject", kind: "subject" },
      { key: "manualCancelOwnerBody", label: "Your email — message", kind: "email" },
    ],
  },
  {
    id: "deposit-expired",
    title: "Deposit not paid",
    description: "When a booking is auto-cancelled after 24 hours without a deposit.",
    fields: [
      { key: "depositExpiredCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "depositExpiredCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "depositExpiredCustomerSms", label: "Customer text message", kind: "sms" },
      { key: "depositExpiredOwnerSubject", label: "Your email — subject", kind: "subject" },
      { key: "depositExpiredOwnerBody", label: "Your email — message", kind: "email" },
    ],
  },
  {
    id: "reminder",
    title: "Appointment reminder",
    description: "Sent 24 hours before a confirmed appointment.",
    fields: [
      { key: "reminderCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "reminderCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "reminderCustomerSms", label: "Customer text message", kind: "sms" },
    ],
  },
  {
    id: "waitlist",
    title: "Waiting list",
    description: "When a slot opens up for someone on the waiting list.",
    fields: [
      { key: "waitlistCustomerSubject", label: "Customer email — subject", kind: "subject" },
      { key: "waitlistCustomerBody", label: "Customer email — message", kind: "email" },
      { key: "waitlistCustomerSms", label: "Customer text message", kind: "sms" },
    ],
  },
];
