-- CreateTable
CREATE TABLE "CategoryExclusionRule" (
    "id" TEXT NOT NULL,
    "categoryA" TEXT NOT NULL,
    "categoryB" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryExclusionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryExclusionRule_categoryA_categoryB_key" ON "CategoryExclusionRule"("categoryA", "categoryB");
