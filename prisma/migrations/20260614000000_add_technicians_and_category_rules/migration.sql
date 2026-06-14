-- Add technician-owned services/bookings without losing live data.
-- Existing services and bookings are assigned to Svitlana's owner profile so
-- the live calendar stays intact and all existing appointment times remain blocked.

CREATE TABLE IF NOT EXISTS "Technician" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "bio" TEXT DEFAULT '',
  "skillLevel" TEXT DEFAULT '',
  "role" TEXT NOT NULL DEFAULT 'technician',
  "loginEmail" TEXT,
  "passwordHash" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Technician_loginEmail_key" ON "Technician"("loginEmail");

INSERT INTO "Technician" (
  "id",
  "name",
  "bio",
  "skillLevel",
  "role",
  "loginEmail",
  "passwordHash",
  "position",
  "active",
  "createdAt",
  "updatedAt"
) VALUES (
  'master-svitlana',
  'Svitlana',
  'Founder of Be Beauty Bar with years of experience across nails, lashes and permanent makeup.',
  'Master',
  'master',
  NULL,
  NULL,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "skillLevel" = EXCLUDED."skillLevel",
  "role" = EXCLUDED."role",
  "loginEmail" = NULL,
  "passwordHash" = NULL,
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "CategoryCapacityRule" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CategoryCapacityRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryCapacityRule_category_key" ON "CategoryCapacityRule"("category");

INSERT INTO "CategoryCapacityRule" ("id", "category", "maxConcurrent", "updatedAt")
VALUES
  ('category-rule-nails', 'nails', 1, CURRENT_TIMESTAMP),
  ('category-rule-lash', 'lash', 2, CURRENT_TIMESTAMP),
  ('category-rule-permanent-makeup', 'permanent-makeup', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("category") DO UPDATE SET
  "maxConcurrent" = EXCLUDED."maxConcurrent",
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "technicianId" TEXT;

UPDATE "Service"
SET "technicianId" = 'master-svitlana'
WHERE "technicianId" IS NULL;

ALTER TABLE "Service" ALTER COLUMN "technicianId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Service_technicianId_fkey'
  ) THEN
    ALTER TABLE "Service"
      ADD CONSTRAINT "Service_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "Technician"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "technicianId" TEXT;

UPDATE "Booking"
SET "technicianId" = "Service"."technicianId"
FROM "Service"
WHERE "Booking"."serviceId" = "Service"."id"
  AND "Booking"."technicianId" IS NULL;

UPDATE "Booking"
SET "technicianId" = 'master-svitlana'
WHERE "technicianId" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "technicianId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Booking_technicianId_fkey'
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "Technician"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
