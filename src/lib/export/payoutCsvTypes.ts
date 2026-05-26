export type PayoutCsvRow = {
  creatorName: string;
  creatorEmail: string;
  rewardMonth: string;
  status: string;
  systemCalculatedAmount: number;
  manualAdjustmentAmount: number;
  finalConfirmedAmount: number;
  currency: string;
  paymentReference?: string;
};
