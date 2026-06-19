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

— **Salon name**`,
  bookingConfirmedCustomerSms:
    "Hi **Customer name**, your booking at **Salon name** is confirmed. **Service** on **Date** at **Time**. We look forward to seeing you!",

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

We look forward to seeing you!

— **Salon name**`,
  reminderCustomerSms:
    "Hi **Customer name**! Just a reminder – your **Service** appointment at **Salon name** is tomorrow **Date** at **Time**. See you soon!",

  waitlistCustomerSubject: "Good news — a slot has opened at **Salon name**",
  waitlistCustomerBody: `Hi **Customer name**,

Great news — a time has become available for **Service** with **Technician**:

Date: **Date**
Time: **Time**

Book this slot now: **Booking link**

Slots aren't held, so please book as soon as you can. First to complete their booking gets the appointment.

We hope to see you soon!

— **Salon name**`,
  waitlistCustomerSms:
    "Hi **Customer name**! A **Service** slot opened at **Salon name** on **Date** at **Time**. Book now: **Booking link**",
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
    description: "When a deposit is received and the booking is confirmed.",
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
    description: "When a slot opens up for someone on the waiting list.",
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
];
