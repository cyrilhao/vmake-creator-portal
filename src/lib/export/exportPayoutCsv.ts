import type { PayoutCsvRow } from "./payoutCsvTypes";

const payoutCsvHeaders = [
  "Creator Name",
  "Creator Email",
  "Reward Month",
  "Status",
  "System Calculated Amount",
  "Manual Adjustment Amount",
  "Final Confirmed Amount",
  "Currency",
  "Payment Reference",
];

export function exportPayoutReviewCsv(rows: PayoutCsvRow[]) {
  const body = rows.map((row) =>
    [
      row.creatorName,
      row.creatorEmail,
      row.rewardMonth,
      row.status,
      formatMoney(row.systemCalculatedAmount),
      formatMoney(row.manualAdjustmentAmount),
      formatMoney(row.finalConfirmedAmount),
      row.currency,
      row.paymentReference ?? "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [payoutCsvHeaders.join(","), ...body].join("\n");
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}
