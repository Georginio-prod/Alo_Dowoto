-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProviderProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "subSectorId" TEXT,
    "city" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "rateFrom" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ratingAverage" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "quartier" TEXT,
    "adresse" TEXT,
    "pointsDeRepere" TEXT,
    "rayonInterventionKm" INTEGER,
    "positionApproximative" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProviderProfile_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProviderProfile_subSectorId_fkey" FOREIGN KEY ("subSectorId") REFERENCES "SubSector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProviderProfile" ("city", "description", "displayName", "id", "photoUrl", "rateFrom", "ratingAverage", "reviewCount", "sectorId", "subSectorId", "updatedAt", "userId", "verified") SELECT "city", "description", "displayName", "id", "photoUrl", "rateFrom", "ratingAverage", "reviewCount", "sectorId", "subSectorId", "updatedAt", "userId", "verified" FROM "ProviderProfile";
DROP TABLE "ProviderProfile";
ALTER TABLE "new_ProviderProfile" RENAME TO "ProviderProfile";
CREATE UNIQUE INDEX "ProviderProfile_userId_key" ON "ProviderProfile"("userId");
CREATE INDEX "ProviderProfile_sectorId_city_idx" ON "ProviderProfile"("sectorId", "city");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
