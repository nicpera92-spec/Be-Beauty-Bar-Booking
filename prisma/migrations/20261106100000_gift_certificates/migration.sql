-- AlterTable
ALTER TABLE "GiftVoucher" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'credit',
ADD COLUMN     "packageName" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "certificateItemId" TEXT;

-- CreateTable
CREATE TABLE "GiftCertificateItem" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "technicianName" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'available',
    "bookingId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCertificateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "serviceIds" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftCertificateItem_voucherId_idx" ON "GiftCertificateItem"("voucherId");

-- AddForeignKey
ALTER TABLE "GiftCertificateItem" ADD CONSTRAINT "GiftCertificateItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "GiftVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCertificateItem" ADD CONSTRAINT "GiftCertificateItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_certificateItemId_fkey" FOREIGN KEY ("certificateItemId") REFERENCES "GiftCertificateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
