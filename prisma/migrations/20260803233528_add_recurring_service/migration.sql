-- CreateTable
CREATE TABLE "RecurringService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChargedAt" DATETIME,
    "nextChargeAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringService_conversationId_key" ON "RecurringService"("conversationId");
