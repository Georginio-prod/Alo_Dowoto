-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN "availability" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "certifications" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "cvFileName" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "cvUrl" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "formations" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "languages" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "mobility" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "payoutMethod" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "rateTo" INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "website" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Complaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'nouveau',
    "adminNote" TEXT,
    "handledAt" DATETIME,
    "handledById" TEXT
);
INSERT INTO "new_Complaint" ("category", "contactEmail", "createdAt", "id", "message", "subject", "userId") SELECT "category", "contactEmail", "createdAt", "id", "message", "subject", "userId" FROM "Complaint";
DROP TABLE "Complaint";
ALTER TABLE "new_Complaint" RENAME TO "Complaint";
CREATE TABLE "new_Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Testimonial" ("createdAt", "id", "message", "name", "rating", "role") SELECT "createdAt", "id", "message", "name", "rating", "role" FROM "Testimonial";
DROP TABLE "Testimonial";
ALTER TABLE "new_Testimonial" RENAME TO "Testimonial";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

