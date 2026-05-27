-- CreateTable
CREATE TABLE "SubmissionPlatformProof" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionPlatformProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionPlatformProof_submissionId_idx" ON "SubmissionPlatformProof"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionPlatformProof_submissionId_platform_key" ON "SubmissionPlatformProof"("submissionId", "platform");

-- AddForeignKey
ALTER TABLE "SubmissionPlatformProof" ADD CONSTRAINT "SubmissionPlatformProof_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
