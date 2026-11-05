-- Salon address for calendar invites and Google Maps directions

ALTER TABLE "BusinessSettings"
  ADD COLUMN IF NOT EXISTS "businessAddress" TEXT;

UPDATE "BusinessSettings"
  SET "businessAddress" = '33 Castle St, Swansea SA1 1HZ'
  WHERE "id" = 'default' AND "businessAddress" IS NULL;
