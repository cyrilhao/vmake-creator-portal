import * as XLSX from "xlsx";
import type { PayoutWorkbookRow } from "../admin/adminTypes";

const worksheetHeaders = [
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
];

export function exportPayoutWorkbook(rows: PayoutWorkbookRow[]) {
  const worksheetData = [
    worksheetHeaders,
    ...rows.map((row) => [
      row.creatorId,
      row.totalViews,
      row.totalViewsReward,
      row.referralCount,
      row.referralReward,
      row.postCount,
      row.postCountReward,
      row.viewRanking,
      row.viewRankingReward,
      row.newbieBonus,
      row.payableAmount,
      row.paypal,
      row.creatorName,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
    { wch: 20 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 16 },
    { wch: 34 },
    { wch: 28 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
}
