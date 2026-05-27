import { describe, expect, it } from "vitest";
import { buildPayoutWorkbookRows } from "./buildPayoutWorkbookRows";
import type { AdminSubmissionListItem } from "../admin/adminTypes";

const submission = (overrides: Partial<AdminSubmissionListItem> = {}): AdminSubmissionListItem => ({
  id: overrides.id ?? "submission-1",
  creatorName: overrides.creatorName ?? "Jane Creator",
  creatorHandle: overrides.creatorHandle ?? "@jane",
  creatorEmail: overrides.creatorEmail ?? "jane@example.com",
  monthLabel: overrides.monthLabel ?? "May 2026",
  rewardMonthKey: overrides.rewardMonthKey ?? "2026-05",
  status: overrides.status ?? "submitted",
  posts: overrides.posts ?? 12,
  totalViews: overrides.totalViews ?? 22000,
  platforms: overrides.platforms ?? ["TikTok"],
  systemEstimatedAmount: overrides.systemEstimatedAmount ?? 95,
  finalConfirmedAmount: overrides.finalConfirmedAmount ?? null,
  currency: overrides.currency ?? "USD",
  submittedAt: overrides.submittedAt ?? "2026-05-01T00:00:00.000Z",
  contentItems: overrides.contentItems ?? [],
  referrals: overrides.referrals ?? [{ id: "ref-1", discordUsername: "friend.one", status: "valid" }],
  platformProofs: overrides.platformProofs ?? [],
  platformContentCounts: overrides.platformContentCounts ?? {},
  rewardBreakdown: overrides.rewardBreakdown ?? [
    { type: "view_reward", amount: 60 },
    { type: "referral_bonus", amount: 30 },
    { type: "starter_bonus", amount: 5 },
  ],
  rewardInput: overrides.rewardInput ?? {},
});

describe("buildPayoutWorkbookRows", () => {
  it("maps admin submissions to the workbook row shape", () => {
    const rows = buildPayoutWorkbookRows([submission()]);

    expect(rows).toEqual([
      expect.objectContaining({
        creatorId: "jane",
        totalViews: 22000,
        totalViewsReward: 60,
        referralCount: 1,
        referralReward: 30,
        postCount: 12,
        postCountReward: 50,
        viewRanking: "#1",
        viewRankingReward: 70,
        newbieBonus: 5,
        payableAmount: 215,
        paypal: "jane@example.com",
        creatorName: "Jane Creator",
      }),
    ]);
  });

  it("falls back to total submitted referrals when no referral is marked valid yet", () => {
    const rows = buildPayoutWorkbookRows([
      submission({
        posts: 2,
        totalViews: 1500,
        referrals: [
          { id: "ref-1", discordUsername: "friend.one", status: "pending" },
          { id: "ref-2", discordUsername: "friend.two", status: "pending" },
        ],
        rewardBreakdown: [{ type: "view_reward", amount: 10 }],
      }),
    ]);

    expect(rows[0].referralCount).toBe(2);
    expect(rows[0].postCountReward).toBe(0);
    expect(rows[0].viewRankingReward).toBe(70);
  });
});
