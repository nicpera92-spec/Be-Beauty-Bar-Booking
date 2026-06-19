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

export const NOTIFICATION_PLACEHOLDERS =
  "{{customerName}}, {{serviceName}}, {{technicianName}}, {{date}}, {{time}}, {{bookLink}}, {{bookingLink}}, {{businessName}}, {{depositLink}}";

export const DEFAULT_NOTIFICATION_MESSAGES: NotificationMessages = {
  bookingCreatedCustomerSubject: "Booking request received – {{businessName}}",
  bookingCreatedCustomerBody: `<h2>Your booking request has been received</h2>
<p>Hi {{customerName}},</p>
<p>We've received your booking. Please pay your deposit within 24 hours to confirm your appointment.</p>
<ul>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p><a href="{{depositLink}}">Pay your deposit here</a> to confirm your booking.</p>
<p>— {{businessName}}</p>`,

  bookingCreatedOwnerSubject: "New booking request – {{customerName}}",
  bookingCreatedOwnerBody: `<h2>New booking request</h2>
<p>A customer has requested a booking. They need to pay the deposit within 24 hours to confirm.</p>
<ul>
<li><strong>Customer:</strong> {{customerName}}</li>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>— {{businessName}} booking system</p>`,

  bookingConfirmedCustomerSubject: "Booking confirmed – {{businessName}}",
  bookingConfirmedCustomerBody: `<h2>Your booking is confirmed</h2>
<p>Hi {{customerName}},</p>
<p>Your deposit has been received. Here are your booking details:</p>
<ul>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>We look forward to seeing you!</p>
<p>— {{businessName}}</p>`,
  bookingConfirmedCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} is confirmed. {{serviceName}} on {{date}} at {{time}}. We look forward to seeing you!",

  bookingConfirmedOwnerSubject: "Booking confirmed – {{customerName}}",
  bookingConfirmedOwnerBody: `<h2>Booking confirmed</h2>
<p>A deposit has been received.</p>
<ul>
<li><strong>Customer:</strong> {{customerName}}</li>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>— {{businessName}} booking system</p>`,

  manualCancelCustomerSubject: "Booking cancelled – {{businessName}}",
  manualCancelCustomerBody: `<h2>Your booking has been cancelled</h2>
<p>Hi {{customerName}},</p>
<p>Your booking has been cancelled. If you have any questions, please contact us.</p>
<ul>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>— {{businessName}}</p>`,
  manualCancelCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} has been cancelled. {{serviceName}} on {{date}} at {{time}}. If you have questions, please contact us.",

  manualCancelOwnerSubject: "Booking cancelled – {{customerName}}",
  manualCancelOwnerBody: `<h2>Booking cancelled</h2>
<p>A booking was cancelled.</p>
<ul>
<li><strong>Customer:</strong> {{customerName}}</li>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>— {{businessName}} booking system</p>`,

  depositExpiredCustomerSubject: "Booking cancelled – {{businessName}}",
  depositExpiredCustomerBody: `<h2>Your booking has been cancelled</h2>
<p>Hi {{customerName}},</p>
<p>Your booking was automatically cancelled because the deposit was not paid within 24 hours.</p>
<ul>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>If you'd still like to book, please visit our booking page.</p>
<p>— {{businessName}}</p>`,
  depositExpiredCustomerSms:
    "Hi {{customerName}}, your booking at {{businessName}} was cancelled because the deposit wasn't paid in time. {{serviceName}} on {{date}} at {{time}}. To rebook, visit our booking page.",

  depositExpiredOwnerSubject: "Booking auto-cancelled (deposit not paid) – {{customerName}}",
  depositExpiredOwnerBody: `<h2>Booking auto-cancelled</h2>
<p>A booking was automatically cancelled because the deposit was not paid within 24 hours.</p>
<ul>
<li><strong>Customer:</strong> {{customerName}}</li>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>— {{businessName}} booking system</p>`,

  reminderCustomerSubject: "Reminder: your appointment tomorrow – {{businessName}}",
  reminderCustomerBody: `<h2>Appointment reminder</h2>
<p>Hi {{customerName}},</p>
<p>This is a friendly reminder that you have an appointment with us tomorrow:</p>
<ul>
<li><strong>Service:</strong> {{serviceName}}</li>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p>We look forward to seeing you!</p>
<p>— {{businessName}}</p>`,
  reminderCustomerSms:
    "Hi {{customerName}}! Just a reminder – your {{serviceName}} appointment at {{businessName}} is tomorrow {{date}} at {{time}}. See you soon!",

  waitlistCustomerSubject: "Good news — a slot has opened at {{businessName}}",
  waitlistCustomerBody: `<h2>A slot has opened up</h2>
<p>Hi {{customerName}},</p>
<p>Great news — a time has become available for <strong>{{serviceName}}</strong> with {{technicianName}}:</p>
<ul>
<li><strong>Date:</strong> {{date}}</li>
<li><strong>Time:</strong> {{time}}</li>
</ul>
<p><a href="{{bookLink}}">Book this slot now</a></p>
<p>Slots aren't held, so we recommend booking as soon as you can. First to complete their booking gets the appointment.</p>
<p>We hope to see you soon!</p>
<p>— {{businessName}}</p>`,
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
    multiline?: boolean;
    sms?: boolean;
  }[];
};

export const NOTIFICATION_MESSAGE_GROUPS: NotificationMessageGroup[] = [
  {
    id: "booking-request",
    title: "Booking request",
    description: "Sent when a customer requests a slot and needs to pay a deposit.",
    fields: [
      { key: "bookingCreatedCustomerSubject", label: "Customer email subject" },
      { key: "bookingCreatedCustomerBody", label: "Customer email body", multiline: true },
      { key: "bookingCreatedOwnerSubject", label: "Your email subject" },
      { key: "bookingCreatedOwnerBody", label: "Your email body", multiline: true },
    ],
  },
  {
    id: "booking-confirmed",
    title: "Booking confirmed",
    description: "Sent when a deposit is received and the booking is confirmed.",
    fields: [
      { key: "bookingConfirmedCustomerSubject", label: "Customer email subject" },
      { key: "bookingConfirmedCustomerBody", label: "Customer email body", multiline: true },
      { key: "bookingConfirmedCustomerSms", label: "Customer SMS", sms: true },
      { key: "bookingConfirmedOwnerSubject", label: "Your email subject" },
      { key: "bookingConfirmedOwnerBody", label: "Your email body", multiline: true },
    ],
  },
  {
    id: "manual-cancel",
    title: "Booking cancelled (by you)",
    description: "Sent when you cancel a booking from the admin.",
    fields: [
      { key: "manualCancelCustomerSubject", label: "Customer email subject" },
      { key: "manualCancelCustomerBody", label: "Customer email body", multiline: true },
      { key: "manualCancelCustomerSms", label: "Customer SMS", sms: true },
      { key: "manualCancelOwnerSubject", label: "Your email subject" },
      { key: "manualCancelOwnerBody", label: "Your email body", multiline: true },
    ],
  },
  {
    id: "deposit-expired",
    title: "Deposit not paid",
    description: "Sent when a booking is auto-cancelled after 24 hours without deposit.",
    fields: [
      { key: "depositExpiredCustomerSubject", label: "Customer email subject" },
      { key: "depositExpiredCustomerBody", label: "Customer email body", multiline: true },
      { key: "depositExpiredCustomerSms", label: "Customer SMS", sms: true },
      { key: "depositExpiredOwnerSubject", label: "Your email subject" },
      { key: "depositExpiredOwnerBody", label: "Your email body", multiline: true },
    ],
  },
  {
    id: "reminder",
    title: "Appointment reminder",
    description: "Sent 24 hours before a confirmed appointment.",
    fields: [
      { key: "reminderCustomerSubject", label: "Customer email subject" },
      { key: "reminderCustomerBody", label: "Customer email body", multiline: true },
      { key: "reminderCustomerSms", label: "Customer SMS", sms: true },
    ],
  },
  {
    id: "waitlist",
    title: "Waiting list",
    description: "Sent when a slot opens up for someone on the waiting list.",
    fields: [
      { key: "waitlistCustomerSubject", label: "Customer email subject" },
      { key: "waitlistCustomerBody", label: "Customer email body", multiline: true },
      { key: "waitlistCustomerSms", label: "Customer SMS", sms: true },
    ],
  },
];
