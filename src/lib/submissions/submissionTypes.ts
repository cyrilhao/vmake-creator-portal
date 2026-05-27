import type { ContentStatus, Platform, SubmissionStatus } from "@/lib/rewards/rewardTypes";

export type CreatorSubmissionDraft = {
  creatorId: string;
  rewardMonth: string;
  status: SubmissionStatus;
  contentItems: CreatorContentDraft[];
  referralDiscordUsernames?: string[];
  platformProofs?: CreatorPlatformProofDraft[];
};

export type CreatorContentDraft = {
  id?: string;
  platform: Platform;
  url: string;
  publishedAt: string;
  monthlyViews: number;
  status?: ContentStatus;
};

export type CreatorPlatformProofDraft = {
  platform: Platform;
  blobUrl: string;
  filename: string;
};

export type ExistingSubmissionSummary = {
  creatorId: string;
  rewardMonth: string;
  status: SubmissionStatus;
};

export type SubmissionValidationIssue = {
  field: string;
  message: string;
};

export type SubmissionValidationResult = {
  valid: boolean;
  issues: SubmissionValidationIssue[];
};
