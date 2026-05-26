import type { ContentStatus, Platform, SubmissionStatus } from "@/lib/rewards/rewardTypes";

export type CreatorSubmissionDraft = {
  creatorId: string;
  rewardMonth: string;
  status: SubmissionStatus;
  contentItems: CreatorContentDraft[];
};

export type CreatorContentDraft = {
  id?: string;
  platform: Platform;
  url: string;
  publishedAt: string;
  monthlyViews: number;
  status?: ContentStatus;
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
