import type { SubmissionStatus } from "@/lib/rewards/rewardTypes";

export type AdminReviewAction =
  | "approve"
  | "reject"
  | "manual_adjustment"
  | "mark_paid";

export type AdminReviewState = {
  submissionId: string;
  status: SubmissionStatus;
  systemCalculatedAmount: number;
  manualAdjustmentAmount: number;
  finalConfirmedAmount: number;
};

export type AdminReviewCommand = {
  action: AdminReviewAction;
  adminId: string;
  adminName: string;
  reason?: string;
  adjustmentAmount?: number;
  paymentReference?: string;
  now: string;
};

export type AdminReviewRecord = {
  submissionId: string;
  adminId: string;
  adminName: string;
  action: AdminReviewAction;
  previousStatus: SubmissionStatus;
  newStatus: SubmissionStatus;
  previousAmount: number;
  newAmount: number;
  reason?: string;
  paymentReference?: string;
  createdAt: string;
};

export type AdminReviewResult = {
  state: AdminReviewState;
  record: AdminReviewRecord;
};
