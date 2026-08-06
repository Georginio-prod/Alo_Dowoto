-- CreateTable
CREATE TABLE "TutorialProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'termine',
    "views" INTEGER NOT NULL DEFAULT 1,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TutorialProgress_userId_idx" ON "TutorialProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialProgress_userId_sectionId_key" ON "TutorialProgress"("userId", "sectionId");
