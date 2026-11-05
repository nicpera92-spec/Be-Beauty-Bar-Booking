-- Short code for the SMS cancel link (bbbar.co.uk/c/<code>)

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "cancelCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_cancelCode_key" ON "Booking"("cancelCode");
