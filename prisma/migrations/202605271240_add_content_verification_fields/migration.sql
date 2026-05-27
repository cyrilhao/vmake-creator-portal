-- CreateEnum
CREATE TYPE "ContentVerificationStatus" AS ENUM ('pending', 'verified', 'unavailable', 'failed');

-- CreateEnum
CREATE TYPE "ContentVerificationSource" AS ENUM ('youtube_api', 'x_api', 'creator_screenshot', 'admin_review');

-- AlterTable
ALTER TABLE "ContentItem"
ADD COLUMN     "autoVerifiedViews" INTEGER,
ADD COLUMN     "externalContentId" TEXT,
ADD COLUMN     "verificationCheckedAt" TIMESTAMP(3),
ADD COLUMN     "verificationError" TEXT,
ADD COLUMN     "verificationSource" "ContentVerificationSource",
ADD COLUMN     "verificationStatus" "ContentVerificationStatus" NOT NULL DEFAULT 'pending';
