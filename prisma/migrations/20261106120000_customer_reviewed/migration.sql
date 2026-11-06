-- AlterTable
ALTER TABLE "CustomerNotificationPreference" ADD COLUMN     "reviewSource" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
