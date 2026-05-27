import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { exportPayoutWorkbook } from "./exportPayoutWorkbook";

describe("exportPayoutWorkbook", () => {
  it("exports workbook rows with the expected header order", () => {
    const buffer = exportPayoutWorkbook([
      {
        creatorId: "alice",
        totalViews: 22000,
        totalViewsReward: 60,
        referralCount: 1,
        referralReward: 30,
        postCount: 14,
        postCountReward: 50,
        viewRanking: "#2",
        viewRankingReward: 50,
        newbieBonus: 5,
        payableAmount: 195,
        paypal: "alice@example.com",
        creatorName: "Alice",
        rewardMonth: "2026-05",
        status: "submitted",
      },
    ]);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets.Sheet1;
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
    });

    expect(rows[0]).toEqual([
      "ID",
      "Total Views",
      "Corresponding Reward",
      "Referral",
      "Corresponding Reward",
      "Post Count",
      "Corresponding Reward",
      "View Ranking",
      "Corresponding Reward",
      "Newbie bouns",
      "应付金额 (美元)",
      "PayPal",
      "Name",
    ]);

    expect(rows[1]).toEqual([
      "alice",
      22000,
      60,
      1,
      30,
      14,
      50,
      "#2",
      50,
      5,
      195,
      "alice@example.com",
      "Alice",
    ]);
  });
});
