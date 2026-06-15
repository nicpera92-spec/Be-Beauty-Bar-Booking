-- Per-service control of whether a deposit is required. When false, a booking
-- for the service is confirmed immediately without a deposit payment.
-- Existing services keep requiring a deposit (true) so current behaviour is unchanged.
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requiresDeposit" BOOLEAN NOT NULL DEFAULT true;
