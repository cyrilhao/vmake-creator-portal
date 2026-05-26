export type Platform = "tiktok" | "instagram" | "youtube";

export type ContentStatus = "pending" | "valid" | "invalid";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

export type RewardLineItemType =
  | "starter_bonus"
  | "view_reward"
  | "grind_master_bonus"
  | "reach_king_bonus"
  | "referral_bonus"
  | "manual_adjustment"
  | "monthly_cap";

export type ContentItemInput = {
  id: string;
  platform: Platform;
  url: string;
  monthlyViews: number;
  status: ContentStatus;
};

export type ReferralInput = {
  id: string;
  status: "pending" | "valid" | "invalid";
};

export type ManualAdjustmentInput = {
  amount: number;
  reason: string;
};

export type SubmissionRewardInput = {
  creatorId: string;
  submissionId: string;
  status: SubmissionStatus;
  hasPreviousValidPost: boolean;
  contentItems: ContentItemInput[];
  referrals?: ReferralInput[];
  manualAdjustment?: ManualAdjustmentInput;
};

export type ViewRewardMode = "tiered_highest" | "tiered_cumulative";

export type RewardRuleConfig = {
  id: string;
  version: string;
  currency: "USD";
  starterBonus: {
    enabled: boolean;
    amount: number;
    onlyFirstEverValidPost: boolean;
  };
  viewRewards: {
    enabled: boolean;
    mode: ViewRewardMode;
    tiers: Array<{
      minViews: number;
      amount: number;
    }>;
  };
  monthlyLeaderboardBonuses: {
    grindMaster: {
      enabled: boolean;
      minValidPosts: number;
      topN: number;
      amountEach: number;
    };
    reachKing: {
      enabled: boolean;
      topN: number;
      prizes: Array<{
        rank: number;
        amount: number;
      }>;
    };
  };
  referralBonus: {
    enabled: boolean;
    amountPerSuccessfulReferral: number;
    requiresReferredCreatorValidPost: boolean;
  };
  monthlyCap: {
    enabled: boolean;
    amount: number | null;
  };
};

export type RewardLineItem = {
  type: RewardLineItemType;
  label: string;
  amount: number;
  metadata?: Record<string, unknown>;
};

export type SubmissionRewardResult = {
  rewardRuleVersionId: string;
  rewardRuleVersion: string;
  currency: "USD";
  totalValidViews: number;
  validContentCount: number;
  platformBreakdown: Record<Platform, number>;
  lineItems: RewardLineItem[];
  estimatedAmountBeforeCap: number;
  capApplied: boolean;
  estimatedAmount: number;
  manualAdjustmentAmount: number;
  finalConfirmedAmount: number;
  payableAmount: number;
};

export type MonthlyLeaderboardCreatorInput = {
  creatorId: string;
  validPostCount: number;
  totalValidViews: number;
};

export type MonthlyLeaderboardBonusResult = {
  rewardRuleVersionId: string;
  currency: "USD";
  winners: Array<{
    creatorId: string;
    lineItems: RewardLineItem[];
  }>;
};
