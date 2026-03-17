-- Safety migration to ensure openTime/closeTime exist in BusinessSettings
-- This is needed because a previous migration was marked as applied via
-- prisma migrate resolve but its SQL was not actually run on the existing
-- production database.

-- 1) Add columns if they don't exist
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "openTime" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "closeTime" TEXT;

-- 2) If legacy openHour/closeHour columns exist, copy their values into the
--    new columns, but only where openTime/closeTime are currently null.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'BusinessSettings'
      AND column_name = 'openHour'
  ) THEN
    UPDATE "BusinessSettings"
    SET "openTime" = LPAD("openHour"::text, 2, '0') || ':00'
    WHERE "openTime" IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'BusinessSettings'
      AND column_name = 'closeHour'
  ) THEN
    UPDATE "BusinessSettings"
    SET "closeTime" = LPAD("closeHour"::text, 2, '0') || ':00'
    WHERE "closeTime" IS NULL;
  END IF;
END $$;

-- 3) Set defaults / non-null constraints to match current Prisma schema
UPDATE "BusinessSettings"
SET "openTime" = COALESCE("openTime", '09:00')
WHERE "openTime" IS NULL;

UPDATE "BusinessSettings"
SET "closeTime" = COALESCE("closeTime", '17:00')
WHERE "closeTime" IS NULL;

ALTER TABLE "BusinessSettings"
  ALTER COLUMN "openTime" SET DEFAULT '09:00',
  ALTER COLUMN "closeTime" SET DEFAULT '17:00',
  ALTER COLUMN "openTime" SET NOT NULL,
  ALTER COLUMN "closeTime" SET NOT NULL;

