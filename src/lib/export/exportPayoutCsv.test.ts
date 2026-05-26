import { describe, expect, it } from "vitest";
import { exportPayoutReviewCsv } from "./exportPayoutCsv";

describe("exportPayoutReviewCsv", () => {
  it("exports monthly payout rows with system and final amounts separated", () => {
    const csv = exportPayoutReviewCsv([
      {
        creatorName: "Jane Creator",
        creatorEmail: "jane@example.com",
        rewardMonth: "2026-05",
        status: "approved",
        systemCalculatedAmount: 100,
        manualAdjustmentAmount: -20,
        finalConfirmedAmount: 80,
        currency: "USD",
      },
    ]);

    expect(csv).toBe(
      [
        "Creator Name,Creator Email,Reward Month,Status,System Calculated Amount,Manual Adjustment Amount,Final Confirmed Amount,Currency,Payment Reference",
        "Jane Creator,jane@example.com,2026-05,approved,100.00,-20.00,80.00,USD,",
      ].join("\n"),
    );
  });

  it("escapes commas, quotes, and line breaks in CSV fields", () => {
    const csv = exportPayoutReviewCsv([
      {
        creatorName: "Jane, \"The Maker\"",
        creatorEmail: "jane@example.com",
        rewardMonth: "2026-05",
        status: "paid",
        systemCalculatedAmount: 70,
        manualAdjustmentAmount: 0,
        finalConfirmedAmount: 70,
        currency: "USD",
        paymentReference: "wire\n123",
      },
    ]);

    expect(csv).toContain("\"Jane, \"\"The Maker\"\"\"");
    expect(csv).toContain("\"wire\n123\"");
  });
});
