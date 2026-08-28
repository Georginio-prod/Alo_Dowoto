-- CreateTable
CREATE TABLE "Verification" (
    "userId" TEXT NOT NULL,
    "idCardImage" TEXT,
    "passportPhotoImage" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("userId")
);
