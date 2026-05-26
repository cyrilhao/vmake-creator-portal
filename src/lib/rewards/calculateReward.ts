import type {
  Platform,
  MonthlyLeaderboardBonusResult,
  MonthlyLeaderboardCreatorInput,
  RewardLineItem,
  RewardRuleConfig,
  SubmissionRewardInput,
  SubmissionRewardResult,
} from "./rewardTypes";
import { supportedPlatforms } from "./rewardTypes";

export function calculateSubmissionReward(
  input: SubmissionRewardInput,
  rules: RewardRuleConfig,
): SubmissionRewardResult {
  const validContent = input.contentItems.filter((item) => item.status === "valid");
  const platformBreakdown = Object.fromEntries(
    supportedPlatforms.map((platform) => [platform, 0]),
  ) as Record<Platform, number>;

  let totalValidViews = 0;

  for (const item of validContent) {
    const safeViews = Math.max(0, item.monthlyViews);
    totalValidViews += safeViews;
    platformBreakdown[item.platform] += safeViews;
  }

  const lineItems: RewardLineItem[] = [];

  if (
    validContent.length > 0 &&
    rules.starterBonus.enabled &&
    (!rules.starterBonus.onlyFirstEverValidPost || !input.hasPreviousValidPost)
  ) {
    lineItems.push({
      type: "starter_bonus",
      label: "Starter bonus for first valid post",
      amount: rules.starterBonus.amount,
    });
  }

  if (rules.viewRewards.enabled && totalValidViews > 0) {
    const eligibleTiers = rules.viewRewards.tiers
      .filter((tier) => totalValidViews >= tier.minViews)
      .sort((a, b) => a.minViews - b.minViews);

    if (rules.viewRewards.mode === "tiered_highest") {
      const highestTier = eligibleTiers.at(-1);

      if (highestTier) {
        lineItems.push({
          type: "view_reward",
          label: `View milestone reward for ${highestTier.minViews} views`,
          amount: highestTier.amount,
          metadata: {
            totalValidViews,
            minViews: highestTier.minViews,
            mode: rules.viewRewards.mode,
          },
        });
      }
    }

    if (rules.viewRewards.mode === "tiered_cumulative") {
      const cumulativeAmount = eligibleTiers.reduce(
        (sum, tier) => sum + tier.amount,
        0,
      );

      if (cumulativeAmount > 0) {
        lineItems.push({
          type: "view_reward",
          label: "Cumulative view milestone rewards",
          amount: cumulativeAmount,
          metadata: {
            totalValidViews,
            tiers: eligibleTiers.map((tier) => tier.minViews),
            mode: rules.viewRewards.mode,
          },
        });
      }
    }
  }

  if (rules.referralBonus.enabled && input.referrals?.length) {
    const validReferralCount = input.referrals.filter(
      (referral) => referral.status === "valid",
    ).length;
    const referralAmount =
      validReferralCount * rules.referralBonus.amountPerSuccessfulReferral;

    if (referralAmount > 0) {
      lineItems.push({
        type: "referral_bonus",
        label: "Referral Master bonus",
        amount: referralAmount,
        metadata: {
          validReferralCount,
        },
      });
    }
  }

  const estimatedAmountBeforeCap = sumLineItems(lineItems);
  let estimatedAmount = estimatedAmountBeforeCap;
  let capApplied = false;

  if (
    rules.monthlyCap.enabled &&
    rules.monthlyCap.amount !== null &&
    estimatedAmount > rules.monthlyCap.amount
  ) {
    const capReduction = rules.monthlyCap.amount - estimatedAmount;
    capApplied = true;
    estimatedAmount = rules.monthlyCap.amount;

    lineItems.push({
      type: "monthly_cap",
      label: "Monthly reward cap",
      amount: capReduction,
      metadata: {
        capAmount: rules.monthlyCap.amount,
      },
    });
  }

  const manualAdjustmentAmount = input.manualAdjustment?.amount ?? 0;

  if (manualAdjustmentAmount !== 0) {
    lineItems.push({
      type: "manual_adjustment",
      label: "Admin manual adjustment",
      amount: manualAdjustmentAmount,
      metadata: {
        reason: input.manualAdjustment?.reason,
      },
    });
  }

  const finalConfirmedAmount = Math.max(0, estimatedAmount + manualAdjustmentAmount);
  const payableAmount =
    input.status === "approved" || input.status === "paid" ? finalConfirmedAmount : 0;

  return {
    rewardRuleVersionId: rules.id,
    rewardRuleVersion: rules.version,
    currency: rules.currency,
    totalValidViews,
    validContentCount: validContent.length,
    platformBreakdown,
    lineItems,
    estimatedAmountBeforeCap,
    capApplied,
    estimatedAmount,
    manualAdjustmentAmount,
    finalConfirmedAmount,
    payableAmount,
  };
}

export function calculateMonthlyLeaderboardBonuses(
  creators: MonthlyLeaderboardCreatorInput[],
  rules: RewardRuleConfig,
): MonthlyLeaderboardBonusResult {
  const winnerMap = new Map<string, RewardLineItem[]>();

  if (rules.monthlyLeaderboardBonuses.grindMaster.enabled) {
    const grindMasterWinners = [...creators]
      .filter(
        (creator) =>
          creator.validPostCount >=
          rules.monthlyLeaderboardBonuses.grindMaster.minValidPosts,
      )
      .sort(
        (a, b) =>
          b.validPostCount - a.validPostCount ||
          a.creatorId.localeCompare(b.creatorId),
      )
      .slice(0, rules.monthlyLeaderboardBonuses.grindMaster.topN);

    for (const winner of grindMasterWinners) {
      addWinnerLineItem(winnerMap, winner.creatorId, {
        type: "grind_master_bonus",
        label: "The Grind Master",
        amount: rules.monthlyLeaderboardBonuses.grindMaster.amountEach,
        metadata: {
          validPostCount: winner.validPostCount,
        },
      });
    }
  }

  if (rules.monthlyLeaderboardBonuses.reachKing.enabled) {
    const reachKingWinners = [...creators]
      .filter((creator) => creator.totalValidViews > 0)
      .sort(
        (a, b) =>
          b.totalValidViews - a.totalValidViews ||
          a.creatorId.localeCompare(b.creatorId),
      )
      .slice(0, rules.monthlyLeaderboardBonuses.reachKing.topN);

    for (const [index, winner] of reachKingWinners.entries()) {
      const rank = index + 1;
      const prize = rules.monthlyLeaderboardBonuses.reachKing.prizes.find(
        (item) => item.rank === rank,
      );

      if (!prize) {
        continue;
      }

      addWinnerLineItem(winnerMap, winner.creatorId, {
        type: "reach_king_bonus",
        label: `The Reach King rank ${rank}`,
        amount: prize.amount,
        metadata: {
          rank,
          totalValidViews: winner.totalValidViews,
        },
      });
    }
  }

  return {
    rewardRuleVersionId: rules.id,
    currency: rules.currency,
    winners: [...winnerMap.entries()].map(([creatorId, lineItems]) => ({
      creatorId,
      lineItems,
    })),
  };
}

function sumLineItems(lineItems: RewardLineItem[]) {
  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}

function addWinnerLineItem(
  winnerMap: Map<string, RewardLineItem[]>,
  creatorId: string,
  lineItem: RewardLineItem,
) {
  const existingLineItems = winnerMap.get(creatorId) ?? [];
  existingLineItems.push(lineItem);
  winnerMap.set(creatorId, existingLineItems);
}
