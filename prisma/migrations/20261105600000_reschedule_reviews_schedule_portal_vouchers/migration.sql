-- Reschedule tracking, review requests, daily schedule emails, My bookings login codes, gift vouchers

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "dailyScheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dailyScheduleLastSentDate" TEXT,
ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestSentAt" TIMESTAMP(3),
ADD COLUMN     "voucherAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "voucherId" TEXT,
ADD COLUMN     "voucherRestoredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GiftVoucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialAmount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "purchaserName" TEXT NOT NULL,
    "purchaserEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "message" TEXT,
    "soldInSalon" BOOLEAN NOT NULL DEFAULT false,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherTransaction" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLoginCode" (
    "id" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftVoucher_code_key" ON "GiftVoucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftVoucher_stripeSessionId_key" ON "GiftVoucher"("stripeSessionId");

-- CreateIndex
CREATE INDEX "VoucherTransaction_voucherId_createdAt_idx" ON "VoucherTransaction"("voucherId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLoginCode_contact_createdAt_idx" ON "CustomerLoginCode"("contact", "createdAt");

-- AddForeignKey
ALTER TABLE "VoucherTransaction" ADD CONSTRAINT "VoucherTransaction_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "GiftVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "GiftVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

