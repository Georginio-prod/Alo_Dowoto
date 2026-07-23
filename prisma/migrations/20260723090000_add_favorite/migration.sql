-- Persistance des favoris client → prestataire (#65, #357). Additif : nouvelle
-- table vide, aucune donnée existante affectée.

-- CreateTable
CREATE TABLE "Favorite" (
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("clientId", "providerId")
);

-- CreateIndex
CREATE INDEX "Favorite_clientId_idx" ON "Favorite"("clientId");
