-- Track bookings cancelled by the customer via the link in their confirmation email/text

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "customerCancelledAt" TIMESTAMP(3);
