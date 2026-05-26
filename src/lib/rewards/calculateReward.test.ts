import { describe, expect, it } from "vitest";
import {
  calculateMonthlyLeaderboardBonuses,
  calculateSubmissionReward,
} from "./calculateReward";
import type {
  ContentItemInput,
  RewardRuleConfig,
  SubmissionRewardInput,
} from "./rewardTypes";
import { vmakeCreatorProgramRulesV1 } from "./vmakeRules";

const validContent = (
  overrides: Partial<ContentItemInput> = {},
): ContentItemInput => ({
  id: overrides.id ?? "content-1",
  platform: overrides.platform ?? "tiktok",
  url: overrides.url ?? "https://example.com/content-1",
  monthlyViews: overrides.monthlyViews ?? 1000,
  status: overrides.status ?? "valid",
});

const submissionInput = (
  overrides: Partial<SubmissionRewardInput> = {},
): SubmissionRewardInput => ({
  creatorId: overrides.creatorId ?? "creator-1",
  submissionId: overrides.submissionId ?? "submission-1",
  status: overrides.status ?? "submitted",
  hasPreviousValidPost: overrides.hasPreviousValidPost ?? true,
  contentItems: overrides.contentItems ?? [],
  referrals: overrides.referrals,
  manualAdjustment: overrides.manualAdjustment,
});

const withCap = (amount: number): RewardRuleConfig => ({
  ...vmakeCreatorProgramRulesV1,
  monthlyCap: {
    enabled: true,
    amount,
  },
});

describe("calculateSubmissionReward", () => {
  it("returns 0 when a creator submits no valid content", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [
          validContent({ status: "invalid", monthlyViews: 100000 }),
          validContent({ id: "content-2", status: "pending", monthlyViews: 50000 }),
        ],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.totalValidViews).toBe(0);
    expect(result.validContentCount).toBe(0);
    expect(result.estimatedAmount).toBe(0);
    expect(result.payableAmount).toBe(0);
  });

  it("applies the US$5 starter bonus for the creator's first valid post", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        hasPreviousValidPost: false,
        contentItems: [validContent({ monthlyViews: 500 })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.lineItems).toContainEqual(
      expect.objectContaining({
        type: "starter_bonus",
        amount: 5,
      }),
    );
    expect(result.estimatedAmount).toBe(5);
  });

  it("does not apply the starter bonus when the creator already has valid content history", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        hasPreviousValidPost: true,
        contentItems: [validContent({ monthlyViews: 500 })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.lineItems.some((item) => item.type === "starter_bonus")).toBe(false);
    expect(result.estimatedAmount).toBe(0);
  });

  it.each([
    [999, 0],
    [1000, 10],
    [2000, 15],
    [5000, 25],
    [10000, 40],
    [20000, 60],
    [50000, 80],
    [100000, 100],
    [120000, 100],
  ])("calculates the correct highest view milestone for %i monthly views", (views, amount) => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [validContent({ monthlyViews: views })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.estimatedAmount).toBe(amount);
  });

  it("selects the highest tier without double-counting lower tiers", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [validContent({ monthlyViews: 100000 })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.lineItems.filter((item) => item.type === "view_reward")).toHaveLength(1);
    expect(result.estimatedAmount).toBe(100);
  });

  it("supports explicitly cumulative view tiers when a rule version asks for it", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [validContent({ monthlyViews: 5000 })],
      }),
      {
        ...vmakeCreatorProgramRulesV1,
        viewRewards: {
          ...vmakeCreatorProgramRulesV1.viewRewards,
          mode: "tiered_cumulative",
        },
      },
    );

    expect(result.estimatedAmount).toBe(50);
  });

  it("excludes invalid content from total views and reward calculation", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [
          validContent({ monthlyViews: 1000 }),
          validContent({ id: "content-2", status: "invalid", monthlyViews: 100000 }),
        ],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.totalValidViews).toBe(1000);
    expect(result.estimatedAmount).toBe(10);
  });

  it("aggregates valid views across TikTok, Instagram, and YouTube", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [
          validContent({ id: "tt", platform: "tiktok", monthlyViews: 1000 }),
          validContent({ id: "ig", platform: "instagram", monthlyViews: 2000 }),
          validContent({ id: "yt", platform: "youtube", monthlyViews: 7000 }),
        ],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.totalValidViews).toBe(10000);
    expect(result.platformBreakdown.tiktok).toBe(1000);
    expect(result.platformBreakdown.instagram).toBe(2000);
    expect(result.platformBreakdown.youtube).toBe(7000);
    expect(result.estimatedAmount).toBe(40);
  });

  it("aggregates valid views across every supported creator platform", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [
          validContent({ id: "x", platform: "x", monthlyViews: 1000 }),
          validContent({ id: "ig", platform: "instagram", monthlyViews: 1000 }),
          validContent({ id: "tt", platform: "tiktok", monthlyViews: 1000 }),
          validContent({ id: "yt", platform: "youtube", monthlyViews: 1000 }),
          validContent({ id: "pin", platform: "pinterest", monthlyViews: 1000 }),
          validContent({ id: "l8", platform: "lemon8", monthlyViews: 1000 }),
          validContent({ id: "th", platform: "threads", monthlyViews: 1000 }),
        ],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.totalValidViews).toBe(7000);
    expect(result.platformBreakdown).toMatchObject({
      x: 1000,
      instagram: 1000,
      tiktok: 1000,
      youtube: 1000,
      pinterest: 1000,
      lemon8: 1000,
      threads: 1000,
    });
  });

  it("applies US$30 per valid referral only", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        referrals: [
          { id: "ref-1", status: "valid" },
          { id: "ref-2", status: "pending" },
          { id: "ref-3", status: "invalid" },
        ],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.lineItems).toContainEqual(
      expect.objectContaining({
        type: "referral_bonus",
        amount: 30,
      }),
    );
    expect(result.estimatedAmount).toBe(30);
  });

  it("caps the estimated amount when a monthly cap exists", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        hasPreviousValidPost: false,
        contentItems: [validContent({ monthlyViews: 100000 })],
        referrals: [{ id: "ref-1", status: "valid" }],
      }),
      withCap(120),
    );

    expect(result.estimatedAmountBeforeCap).toBe(135);
    expect(result.capApplied).toBe(true);
    expect(result.estimatedAmount).toBe(120);
    expect(result.lineItems).toContainEqual(
      expect.objectContaining({
        type: "monthly_cap",
        amount: -15,
      }),
    );
  });

  it("reflects admin manual adjustment in the final confirmed amount", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [validContent({ monthlyViews: 10000 })],
        manualAdjustment: {
          amount: -10,
          reason: "Adjusted after view verification.",
        },
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.estimatedAmount).toBe(40);
    expect(result.manualAdjustmentAmount).toBe(-10);
    expect(result.finalConfirmedAmount).toBe(30);
  });

  it("does not generate payable rewards for rejected submissions", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        status: "rejected",
        contentItems: [validContent({ monthlyViews: 100000 })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.estimatedAmount).toBe(100);
    expect(result.payableAmount).toBe(0);
  });

  it("stores the rule version used in the result", () => {
    const result = calculateSubmissionReward(
      submissionInput({
        contentItems: [validContent({ monthlyViews: 1000 })],
      }),
      vmakeCreatorProgramRulesV1,
    );

    expect(result.rewardRuleVersionId).toBe(vmakeCreatorProgramRulesV1.id);
    expect(result.rewardRuleVersion).toBe(vmakeCreatorProgramRulesV1.version);
  });
});

describe("calculateMonthlyLeaderboardBonuses", () => {
  it("rewards the top 3 Grind Master creators with at least 10 valid posts", () => {
    const result = calculateMonthlyLeaderboardBonuses(
      [
        { creatorId: "creator-a", validPostCount: 12, totalValidViews: 2000 },
        { creatorId: "creator-b", validPostCount: 11, totalValidViews: 3000 },
        { creatorId: "creator-c", validPostCount: 10, totalValidViews: 4000 },
        { creatorId: "creator-d", validPostCount: 9, totalValidViews: 100000 },
      ],
      vmakeCreatorProgramRulesV1,
    );

    const grindWinners = result.winners.filter((winner) =>
      winner.lineItems.some((item) => item.type === "grind_master_bonus"),
    );

    expect(grindWinners.map((winner) => winner.creatorId)).toEqual([
      "creator-a",
      "creator-b",
      "creator-c",
    ]);
    expect(
      grindWinners.every((winner) =>
        winner.lineItems.some(
          (item) => item.type === "grind_master_bonus" && item.amount === 50,
        ),
      ),
    ).toBe(true);
  });

  it("rewards Reach King rank 1, 2, and 3 with US$70, US$50, and US$30", () => {
    const result = calculateMonthlyLeaderboardBonuses(
      [
        { creatorId: "creator-a", validPostCount: 1, totalValidViews: 90000 },
        { creatorId: "creator-b", validPostCount: 1, totalValidViews: 120000 },
        { creatorId: "creator-c", validPostCount: 1, totalValidViews: 60000 },
        { creatorId: "creator-d", validPostCount: 1, totalValidViews: 5000 },
      ],
      vmakeCreatorProgramRulesV1,
    );

    const winnerMap = new Map(
      result.winners.map((winner) => [
        winner.creatorId,
        winner.lineItems.find((item) => item.type === "reach_king_bonus")?.amount,
      ]),
    );

    expect(winnerMap.get("creator-b")).toBe(70);
    expect(winnerMap.get("creator-a")).toBe(50);
    expect(winnerMap.get("creator-c")).toBe(30);
    expect(winnerMap.has("creator-d")).toBe(false);
  });

  it("handles leaderboard ties deterministically by creator id", () => {
    const result = calculateMonthlyLeaderboardBonuses(
      [
        { creatorId: "creator-c", validPostCount: 10, totalValidViews: 10000 },
        { creatorId: "creator-a", validPostCount: 10, totalValidViews: 10000 },
        { creatorId: "creator-b", validPostCount: 10, totalValidViews: 10000 },
      ],
      vmakeCreatorProgramRulesV1,
    );

    const reachWinners = result.winners
      .filter((winner) =>
        winner.lineItems.some((item) => item.type === "reach_king_bonus"),
      )
      .map((winner) => winner.creatorId);

    expect(reachWinners).toEqual(["creator-a", "creator-b", "creator-c"]);
  });
});
