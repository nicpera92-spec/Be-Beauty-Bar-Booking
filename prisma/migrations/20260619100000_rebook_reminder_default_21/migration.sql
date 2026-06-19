-- Default rebook reminder timing: 21 days after last visit
ALTER TABLE "BusinessSettings" ALTER COLUMN "rebookReminderDaysAfter" SET DEFAULT 21;
