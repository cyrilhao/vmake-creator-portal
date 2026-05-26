-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('x', 'tiktok', 'instagram', 'youtube', 'pinterest', 'lemon8', 'threads');

-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('pending', 'valid', 'invalid');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'valid', 'invalid');

-- CreateEnum
CREATE TYPE "RewardRuleStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'reviewer', 'finance');

-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('reviewed', 'content_validated', 'adjusted', 'approved', 'rejected', 'payout_approved', 'paid');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('not_ready', 'approved', 'paid', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "externalCreatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "handle" TEXT,
    "referralCode" TEXT,
    "referredByCreatorId" TEXT,
    "status" "CreatorStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'reviewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rewardMonth" TIMESTAMP(3) NOT NULL,
    "creatorReportedTotalViews" INTEGER NOT NULL DEFAULT 0,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "monthlyViews" INTEGER NOT NULL,
    "creatorReportedViews" INTEGER NOT NULL,
    "adminVerifiedViews" INTEGER,
    "status" "ContentItemStatus" NOT NULL DEFAULT 'pending',
    "invalidReason" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionReferral" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRuleVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "RewardRuleStatus" NOT NULL DEFAULT 'draft',
    "configJson" JSONB NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCalculationResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rewardRuleVersionId" TEXT NOT NULL,
    "calculatedAmount" DECIMAL(10,2) NOT NULL,
    "cappedAmount" DECIMAL(10,2),
    "finalEstimatedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "calculationInputJson" JSONB NOT NULL,
    "calculationBreakdownJson" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardCalculationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminReviewRecord" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "previousStatus" "SubmissionStatus",
    "newStatus" "SubmissionStatus",
    "previousAmount" DECIMAL(10,2),
    "newAmount" DECIMAL(10,2),
    "reason" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminReviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rewardMonth" TIMESTAMP(3) NOT NULL,
    "systemCalculatedAmount" DECIMAL(10,2) NOT NULL,
    "adminAdjustmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalConfirmedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'not_ready',
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidByAdminId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Creator_externalCreatorId_key" ON "Creator"("externalCreatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_email_key" ON "Creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_referralCode_key" ON "Creator"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Submission_rewardMonth_status_idx" ON "Submission"("rewardMonth", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_creatorId_rewardMonth_key" ON "Submission"("creatorId", "rewardMonth");

-- CreateIndex
CREATE INDEX "ContentItem_platform_status_idx" ON "ContentItem"("platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_submissionId_url_key" ON "ContentItem"("submissionId", "url");

-- CreateIndex
CREATE INDEX "SubmissionReferral_submissionId_status_idx" ON "SubmissionReferral"("submissionId", "status");

-- CreateIndex
CREATE INDEX "RewardRuleVersion_status_effectiveFrom_idx" ON "RewardRuleVersion"("status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRuleVersion_name_version_key" ON "RewardRuleVersion"("name", "version");

-- CreateIndex
CREATE INDEX "RewardCalculationResult_submissionId_calculatedAt_idx" ON "RewardCalculationResult"("submissionId", "calculatedAt");

-- CreateIndex
CREATE INDEX "AdminReviewRecord_submissionId_createdAt_idx" ON "AdminReviewRecord"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminReviewRecord_adminId_createdAt_idx" ON "AdminReviewRecord"("adminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_submissionId_key" ON "Payout"("submissionId");

-- CreateIndex
CREATE INDEX "Payout_rewardMonth_status_idx" ON "Payout"("rewardMonth", "status");

-- CreateIndex
CREATE INDEX "Payout_creatorId_rewardMonth_idx" ON "Payout"("creatorId", "rewardMonth");

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_referredByCreatorId_fkey" FOREIGN KEY ("referredByCreatorId") REFERENCES "Creator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReferral" ADD CONSTRAINT "SubmissionReferral_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRuleVersion" ADD CONSTRAINT "RewardRuleVersion_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardCalculationResult" ADD CONSTRAINT "RewardCalculationResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardCalculationResult" ADD CONSTRAINT "RewardCalculationResult_rewardRuleVersionId_fkey" FOREIGN KEY ("rewardRuleVersionId") REFERENCES "RewardRuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReviewRecord" ADD CONSTRAINT "AdminReviewRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminReviewRecord" ADD CONSTRAINT "AdminReviewRecord_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
