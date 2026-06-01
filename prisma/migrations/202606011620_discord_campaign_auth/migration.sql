-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'archived');

-- AlterTable
ALTER TABLE "Creator"
  ALTER COLUMN "externalCreatorId" DROP NOT NULL,
  ALTER COLUMN "email" DROP NOT NULL,
  ADD COLUMN "discordAvatarUrl" TEXT,
  ADD COLUMN "discordUserId" TEXT,
  ADD COLUMN "discordUsername" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rewardMonth" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Submission"
  ADD COLUMN "campaignId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "Submission_creatorId_rewardMonth_key";

-- DropIndex
DROP INDEX IF EXISTS "SubmissionPlatformProof_submissionId_platform_key";

-- CreateIndex
CREATE UNIQUE INDEX "Creator_discordUserId_key" ON "Creator"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE INDEX "Campaign_isActive_status_idx" ON "Campaign"("isActive", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_creatorId_campaignId_key" ON "Submission"("creatorId", "campaignId");

-- CreateIndex
CREATE INDEX "Submission_campaignId_status_idx" ON "Submission"("campaignId", "status");

-- CreateIndex
CREATE INDEX "SubmissionPlatformProof_submissionId_platform_idx" ON "SubmissionPlatformProof"("submissionId", "platform");

-- AddForeignKey
ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
