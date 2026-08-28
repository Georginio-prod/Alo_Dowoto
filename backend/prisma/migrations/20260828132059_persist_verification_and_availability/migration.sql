-- CreateTable
CREATE TABLE "UnavailabilityPeriod" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnavailabilityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnavailabilityPeriod_providerId_idx" ON "UnavailabilityPeriod"("providerId");
