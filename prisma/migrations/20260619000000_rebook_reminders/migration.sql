-- Rebook reminder settings, per-booking send tracking, and customer opt-out preferences

ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "rebookReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rebookReminderDaysAfter" INTEGER NOT NULL DEFAULT 21;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "rebookReminderSentAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CustomerNotificationPreference" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "rebookReminderOptOut" BOOLEAN NOT NULL DEFAULT false,
  "rebookOptOutAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerNotificationPreference_email_key"
  ON "CustomerNotificationPreference"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerNotificationPreference_phone_key"
  ON "CustomerNotificationPreference"("phone");
