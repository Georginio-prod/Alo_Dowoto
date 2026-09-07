-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestMatch" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "subSector" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "priceFrom" INTEGER NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "score" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringService" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChargedAt" TIMESTAMP(3),
    "nextChargeAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "RecurringService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyUsageCounter" (
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MonthlyUsageCounter_pkey" PRIMARY KEY ("userId","scope","month")
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequest_userId_createdAt_idx" ON "ServiceRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestMatch_providerId_createdAt_idx" ON "ServiceRequestMatch"("providerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestMatch_requestId_providerId_key" ON "ServiceRequestMatch"("requestId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringService_conversationId_key" ON "RecurringService"("conversationId");

-- CreateIndex
CREATE INDEX "RecurringService_clientId_idx" ON "RecurringService"("clientId");

-- CreateIndex
CREATE INDEX "RecurringService_providerId_idx" ON "RecurringService"("providerId");

-- CreateIndex
CREATE INDEX "FraudAlert_clientId_createdAt_idx" ON "FraudAlert"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudAlert_providerId_createdAt_idx" ON "FraudAlert"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudAlert_createdAt_idx" ON "FraudAlert"("createdAt");

-- AddForeignKey
ALTER TABLE "ServiceRequestMatch" ADD CONSTRAINT "ServiceRequestMatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
