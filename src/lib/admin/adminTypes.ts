export type AdminSubmissionListItem = {
  id: string;
  creatorName: string;
  creatorHandle: string;
  creatorEmail: string;
  monthLabel: string;
  rewardMonthKey: string;
  status: string;
  posts: number;
  totalViews: number;
  platforms: string[];
  systemEstimatedAmount: number;
  finalConfirmedAmount: null | number;
  currency: string;
  submittedAt: string;
  contentItems: Array<{
    id: string;
    platform: string;
    url: string;
    autoVerifiedViews: null | number;
    adminVerifiedViews: null | number;
    verificationStatus: string;
    verificationSource: null | string;
    verificationError: null | string;
    status: string;
    publishedAt: string;
  }>;
  referrals: Array<{
    id: string;
    discordUsername: string;
    status: string;
  }>;
  platformProofs: Array<{
    id: string;
    platform: string;
    url: string;
    filename: string;
  }>;
  platformContentCounts: Record<string, unknown>;
  rewardBreakdown: Array<{
    type?: string;
    label?: string;
    amount?: number;
  }>;
  rewardInput: Record<string, unknown>;
};

export type PayoutWorkbookRow = {
  creatorId: string;
  totalViews: number;
  totalViewsReward: number;
  referralCount: number;
  referralReward: number;
  postCount: number;
  postCountReward: number;
  viewRanking: null | string;
  viewRankingReward: number;
  newbieBonus: number;
  payableAmount: number;
  paypal: string;
  creatorName: string;
  rewardMonth: string;
  status: string;
};
