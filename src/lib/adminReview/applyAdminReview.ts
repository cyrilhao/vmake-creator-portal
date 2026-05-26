import type {
  AdminReviewCommand,
  AdminReviewRecord,
  AdminReviewResult,
  AdminReviewState,
} from "./adminReviewTypes";

export function applyAdminReview(
  state: AdminReviewState,
  command: AdminReviewCommand,
): AdminReviewResult {
  const previousStatus = state.status;
  const previousAmount = state.finalConfirmedAmount;
  let nextState: AdminReviewState = { ...state };

  if (command.action === "approve") {
    nextState = {
      ...nextState,
      status: "approved",
    };
  }

  if (command.action === "reject") {
    requireReason(command.reason, "Rejecting a submission requires a reason.");
    nextState = {
      ...nextState,
      status: "rejected",
      finalConfirmedAmount: 0,
    };
  }

  if (command.action === "manual_adjustment") {
    requireReason(command.reason, "Manual adjustment requires a reason.");

    const adjustmentAmount = command.adjustmentAmount ?? 0;
    const totalAdjustment = nextState.manualAdjustmentAmount + adjustmentAmount;

    nextState = {
      ...nextState,
      manualAdjustmentAmount: totalAdjustment,
      finalConfirmedAmount: Math.max(
        0,
        nextState.systemCalculatedAmount + totalAdjustment,
      ),
    };
  }

  if (command.action === "mark_paid") {
    if (state.status !== "approved") {
      throw new Error("Only approved submissions can be marked as paid.");
    }

    nextState = {
      ...nextState,
      status: "paid",
    };
  }

  return {
    state: nextState,
    record: createReviewRecord(state, nextState, command, previousStatus, previousAmount),
  };
}

function createReviewRecord(
  previousState: AdminReviewState,
  nextState: AdminReviewState,
  command: AdminReviewCommand,
  previousStatus: AdminReviewState["status"],
  previousAmount: number,
): AdminReviewRecord {
  return {
    submissionId: previousState.submissionId,
    adminId: command.adminId,
    adminName: command.adminName,
    action: command.action,
    previousStatus,
    newStatus: nextState.status,
    previousAmount,
    newAmount: nextState.finalConfirmedAmount,
    reason: command.reason,
    paymentReference: command.paymentReference,
    createdAt: command.now,
  };
}

function requireReason(reason: string | undefined, message: string) {
  if (!reason?.trim()) {
    throw new Error(message);
  }
}
