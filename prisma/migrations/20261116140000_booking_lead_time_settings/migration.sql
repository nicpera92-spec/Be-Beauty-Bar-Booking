-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN "bookingMinAdvanceDays" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "BusinessSettings" ADD COLUMN "bookingCutoffTime" TEXT NOT NULL DEFAULT '18:00';
