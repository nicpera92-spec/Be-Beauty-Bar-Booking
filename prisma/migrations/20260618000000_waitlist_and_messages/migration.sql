-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "notificationMessages" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WaitingListEntry" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyBySMS" BOOLEAN NOT NULL DEFAULT false,
    "preferredDate" TEXT NOT NULL,
    "notifyEarliest" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastNotifiedAt" TIMESTAMP(3),
    "notifiedSlotDate" TEXT,
    "notifiedSlotTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitingListEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WaitingListEntry_serviceId_technicianId_preferredDate_status_idx" ON "WaitingListEntry"("serviceId", "technicianId", "preferredDate", "status");
CREATE INDEX IF NOT EXISTS "WaitingListEntry_preferredDate_status_idx" ON "WaitingListEntry"("preferredDate", "status");

ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;
