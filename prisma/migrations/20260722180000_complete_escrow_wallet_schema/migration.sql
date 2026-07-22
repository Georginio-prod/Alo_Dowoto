-- Complète le socle de persistance du cluster portefeuille + séquestre (#342,
-- ADR 0013). Colonnes de litige et de preuve d'intervention manquantes sur
-- EscrowOrder, et table WalletRecharge (recharges mobile money). Additif :
-- toutes les colonnes sont nullables, la nouvelle table est vide — aucune
-- donnée existante n'est affectée. La valeur d'enum `cancellation_compensation`
-- ajoutée à WalletMovementType n'émet aucun DDL sous SQLite (les enums y sont
-- des colonnes TEXT).

-- AlterTable
ALTER TABLE "EscrowOrder" ADD COLUMN "checkInAt" DATETIME;
ALTER TABLE "EscrowOrder" ADD COLUMN "checkInLat" REAL;
ALTER TABLE "EscrowOrder" ADD COLUMN "checkInLng" REAL;
ALTER TABLE "EscrowOrder" ADD COLUMN "checkOutAt" DATETIME;
ALTER TABLE "EscrowOrder" ADD COLUMN "checkOutLat" REAL;
ALTER TABLE "EscrowOrder" ADD COLUMN "checkOutLng" REAL;
ALTER TABLE "EscrowOrder" ADD COLUMN "disputeEvidence" TEXT;
ALTER TABLE "EscrowOrder" ADD COLUMN "disputeRespondedAt" DATETIME;
ALTER TABLE "EscrowOrder" ADD COLUMN "disputeResponse" TEXT;

-- CreateTable
CREATE TABLE "WalletRecharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "operatorRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "WalletRecharge_userId_idx" ON "WalletRecharge"("userId");
