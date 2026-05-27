import type { AdminSubmissionListItem, PayoutWorkbookRow } from "../admin/adminTypes";
import { calculateMonthlyLeaderboardBonuses } from "../rewards/calculateReward";
import { vmakeCreatorProgramRulesV1 } from "../rewards/vmakeRules";

export function buildPayoutWorkbookRows(submissions: AdminSubmissionListItem[]) {
  const leaderboardWinners = calculateMonthlyLeaderboardBonuses(
    submissions.map((submission) => ({
      creatorId: submission.id,
      validPostCount: submission.posts,
      totalValidViews: submission.totalViews,
    })),
    vmakeCreatorProgramRulesV1,
  );

  const creatorLeaderboardRewards = new Map<
    string,
    {
      postCountReward: number;
      viewRankingReward: number;
      viewRanking: null | string;
    }
  >();

  leaderboardWinners.winners.forEach((winner) => {
    const summary = creatorLeaderboardRewards.get(winner.creatorId) ?? {
      postCountReward: 0,
      viewRankingReward: 0,
      viewRanking: null,
    };

    winner.lineItems.forEach((lineItem) => {
      if (lineItem.type === "grind_master_bonus") {
        summary.postCountReward += lineItem.amount;
      }

      if (lineItem.type === "reach_king_bonus") {
        summary.viewRankingReward += lineItem.amount;
        const rank = lineItem.metadata?.rank;

        if (typeof rank === "number") {
          summary.viewRanking = `#${rank}`;
        }
      }
    });

    creatorLeaderboardRewards.set(winner.creatorId, summary);
  });

  return submissions
    .map((submission) => {
      const viewReward = sumLineItemAmounts(submission, "view_reward");
      const referralReward = sumLineItemAmounts(submission, "referral_bonus");
      const newbieBonus = sumLineItemAmounts(submission, "starter_bonus");
      const leaderboard = creatorLeaderboardRewards.get(submission.id) ?? {
        postCountReward: 0,
        viewRankingReward: 0,
        viewRanking: null,
      };
      const referralCount = countValidReferrals(submission);
      const payableAmount =
        viewReward +
        referralReward +
        leaderboard.postCountReward +
        leaderboard.viewRankingReward +
        newbieBonus;

      return {
        creatorId: normalizeCreatorId(submission.creatorHandle),
        totalViews: submission.totalViews,
        totalViewsReward: viewReward,
        referralCount,
        referralReward,
        postCount: submission.posts,
        postCountReward: leaderboard.postCountReward,
        viewRanking: leaderboard.viewRanking,
        viewRankingReward: leaderboard.viewRankingReward,
        newbieBonus,
        payableAmount,
        paypal: submission.creatorEmail,
        creatorName: submission.creatorName,
        rewardMonth: submission.rewardMonthKey,
        status: submission.status,
      } satisfies PayoutWorkbookRow;
    })
    .sort((left, right) => right.totalViews - left.totalViews || left.creatorId.localeCompare(right.creatorId));
}

function sumLineItemAmounts(submission: AdminSubmissionListItem, type: string) {
  return submission.rewardBreakdown
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
}

function countValidReferrals(submission: AdminSubmissionListItem) {
  const validCount = submission.referrals.filter((referral) => referral.status === "valid").length;

  if (validCount > 0) {
    return validCount;
  }

  return submission.referrals.length;
}

function normalizeCreatorId(handle: string) {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}
