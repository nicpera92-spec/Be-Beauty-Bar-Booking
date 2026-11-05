-- Optional deposit as a percentage of the service price

ALTER TABLE "Service"
  ADD COLUMN IF NOT EXISTS "depositPercent" DOUBLE PRECISION;
