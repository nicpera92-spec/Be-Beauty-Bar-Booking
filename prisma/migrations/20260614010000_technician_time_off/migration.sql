-- Per-technician time off. Existing blocks keep technicianId = NULL, which
-- means salon-wide (managed by the master) — preserving current behaviour.
ALTER TABLE "AvailabilityBlock" ADD COLUMN IF NOT EXISTS "technicianId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityBlock_technicianId_fkey'
  ) THEN
    ALTER TABLE "AvailabilityBlock"
      ADD CONSTRAINT "AvailabilityBlock_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "Technician"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
