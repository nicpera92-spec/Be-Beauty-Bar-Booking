-- Time off is now personal to each technician — a technician's time off only
-- blocks their own calendar, never the whole salon. Any legacy salon-wide
-- blocks (technicianId IS NULL) belonged to the owner, so assign them to the
-- master profile so the owner's existing time off keeps working.
UPDATE "AvailabilityBlock"
SET "technicianId" = (
  SELECT "id" FROM "Technician" WHERE "role" = 'master' ORDER BY "position" ASC LIMIT 1
)
WHERE "technicianId" IS NULL;
