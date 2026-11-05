-- Owner-editable cancellation policy text and refund window

ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "cancellationRefundHours" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;
