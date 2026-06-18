-- Theme colour columns for admin palette (booking + admin UI)

ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;

UPDATE "BusinessSettings"
SET
  "primaryColor" = COALESCE("primaryColor", '#1e3a5f'),
  "secondaryColor" = COALESCE("secondaryColor", '#2c5282')
WHERE "primaryColor" IS NULL OR "secondaryColor" IS NULL;

ALTER TABLE "BusinessSettings"
  ALTER COLUMN "primaryColor" SET DEFAULT '#1e3a5f',
  ALTER COLUMN "secondaryColor" SET DEFAULT '#2c5282';
