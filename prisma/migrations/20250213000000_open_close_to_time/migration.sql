-- Migrate openHour/closeHour to openTime/closeTime (preserve existing data)
-- Add new columns
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "openTime" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "closeTime" TEXT;

-- Migrate data from openHour/closeHour (handle both old schema and partial migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BusinessSettings' AND column_name = 'openHour') THEN
    UPDATE "BusinessSettings" SET "openTime" = LPAD("openHour"::text, 2, '0') || ':00' WHERE "openTime" IS NULL;
    UPDATE "BusinessSettings" SET "closeTime" = LPAD("closeHour"::text, 2, '0') || ':00' WHERE "closeTime" IS NULL;
  END IF;
END $$;

-- Set defaults for any nulls
UPDATE "BusinessSettings" SET "openTime" = COALESCE("openTime", '09:00') WHERE "openTime" IS NULL;
UPDATE "BusinessSettings" SET "closeTime" = COALESCE("closeTime", '17:00') WHERE "closeTime" IS NULL;

-- Make not null and set default
ALTER TABLE "BusinessSettings" ALTER COLUMN "openTime" SET DEFAULT '09:00';
ALTER TABLE "BusinessSettings" ALTER COLUMN "closeTime" SET DEFAULT '17:00';
ALTER TABLE "BusinessSettings" ALTER COLUMN "openTime" SET NOT NULL;
ALTER TABLE "BusinessSettings" ALTER COLUMN "closeTime" SET NOT NULL;

-- Drop old columns if they exist
ALTER TABLE "BusinessSettings" DROP COLUMN IF EXISTS "openHour";
ALTER TABLE "BusinessSettings" DROP COLUMN IF EXISTS "closeHour";
