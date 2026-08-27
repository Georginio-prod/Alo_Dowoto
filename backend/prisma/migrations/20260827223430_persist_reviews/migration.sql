/*
  Warnings:

  - You are about to drop the column `providerId` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[conversationId,authorId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversationId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_providerId_fkey";

-- DropIndex
DROP INDEX "Review_providerId_idx";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "providerId",
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Review_targetId_idx" ON "Review"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_conversationId_authorId_key" ON "Review"("conversationId", "authorId");
