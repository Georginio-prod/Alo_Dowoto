-- CreateTable
CREATE TABLE "WebhookNonce" (
    "nonce" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiRateWindow" (
    "key" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("key", "windowStart")
);

-- CreateIndex
CREATE INDEX "WebhookNonce_expiresAt_idx" ON "WebhookNonce"("expiresAt");

-- CreateIndex
CREATE INDEX "AiRateWindow_windowStart_idx" ON "AiRateWindow"("windowStart");
