-- Per-technician control of the order their service categories appear in on the
-- booking page. Stored as a JSON array of category slugs (nullable; falls back
-- to the default order when not set).
ALTER TABLE "Technician" ADD COLUMN IF NOT EXISTS "categoryOrder" TEXT;
