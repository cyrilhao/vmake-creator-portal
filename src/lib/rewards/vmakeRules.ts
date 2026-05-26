import type { RewardRuleConfig } from "./rewardTypes";

export const vmakeCreatorProgramRulesV1: RewardRuleConfig = {
  id: "vmake-creator-program-v1",
  version: "2026-creator-program-v1",
  currency: "USD",
  starterBonus: {
    enabled: true,
    amount: 5,
    onlyFirstEverValidPost: true,
  },
  viewRewards: {
    enabled: true,
    mode: "tiered_highest",
    tiers: [
      { minViews: 1000, amount: 10 },
      { minViews: 2000, amount: 15 },
      { minViews: 5000, amount: 25 },
      { minViews: 10000, amount: 40 },
      { minViews: 20000, amount: 60 },
      { minViews: 50000, amount: 80 },
      { minViews: 100000, amount: 100 },
    ],
  },
  monthlyLeaderboardBonuses: {
    grindMaster: {
      enabled: true,
      minValidPosts: 10,
      topN: 3,
      amountEach: 50,
    },
    reachKing: {
      enabled: true,
      topN: 3,
      prizes: [
        { rank: 1, amount: 70 },
        { rank: 2, amount: 50 },
        { rank: 3, amount: 30 },
      ],
    },
  },
  referralBonus: {
    enabled: true,
    amountPerSuccessfulReferral: 30,
    requiresReferredCreatorValidPost: true,
  },
  monthlyCap: {
    enabled: false,
    amount: null,
  },
};
