import { describe, expect, it } from "vitest";
import { applyAdminReview } from "./applyAdminReview";
import type { AdminReviewState } from "./adminReviewTypes";

const reviewState = (overrides: Partial<AdminReviewState> = {}): AdminReviewState => ({
  submissionId: overrides.submissionId ?? "submission-1",
  status: overrides.status ?? "under_review",
  systemCalculatedAmount: overrides.systemCalculatedAmount ?? 100,
  manualAdjustmentAmount: overrides.manualAdjustmentAmount ?? 0,
  finalConfirmedAmount: overrides.finalConfirmedAmount ?? 100,
});

describe("applyAdminReview", () => {
  it("approves a submission and keeps the final confirmed amount separate from system amount", () => {
    const result = applyAdminReview(reviewState(), {
      action: "approve",
      adminId: "admin-1",
      adminName: "Alice",
      now: "2026-05-26T10:00:00.000Z",
    });

    expect(result.state.status).toBe("approved");
    expect(result.state.systemCalculatedAmount).toBe(100);
    expect(result.state.finalConfirmedAmount).toBe(100);
    expect(result.record).toMatchObject({
      action: "approve",
      previousStatus: "under_review",
      newStatus: "approved",
      adminName: "Alice",
    });
  });

  it("requires a reason when rejecting a submission", () => {
    expect(() =>
      applyAdminReview(reviewState(), {
        action: "reject",
        adminId: "admin-1",
        adminName: "Alice",
        now: "2026-05-26T10:00:00.000Z",
      }),
    ).toThrow("Rejecting a submission requires a reason.");
  });

  it("rejects a submission with an audit record when a reason is provided", () => {
    const result = applyAdminReview(reviewState(), {
      action: "reject",
      adminId: "admin-1",
      adminName: "Alice",
      reason: "Content does not meet requirements.",
      now: "2026-05-26T10:00:00.000Z",
    });

    expect(result.state.status).toBe("rejected");
    expect(result.state.finalConfirmedAmount).toBe(0);
    expect(result.record.reason).toBe("Content does not meet requirements.");
  });

  it("requires a reason for manual adjustments", () => {
    expect(() =>
      applyAdminReview(reviewState(), {
        action: "manual_adjustment",
        adminId: "admin-1",
        adminName: "Alice",
        adjustmentAmount: -20,
        now: "2026-05-26T10:00:00.000Z",
      }),
    ).toThrow("Manual adjustment requires a reason.");
  });

  it("applies a manual adjustment and records previous and new amount", () => {
    const result = applyAdminReview(reviewState(), {
      action: "manual_adjustment",
      adminId: "admin-1",
      adminName: "Alice",
      adjustmentAmount: -20,
      reason: "One post had unverifiable views.",
      now: "2026-05-26T10:00:00.000Z",
    });

    expect(result.state.manualAdjustmentAmount).toBe(-20);
    expect(result.state.finalConfirmedAmount).toBe(80);
    expect(result.record.previousAmount).toBe(100);
    expect(result.record.newAmount).toBe(80);
  });

  it("does not let final confirmed amount go below zero", () => {
    const result = applyAdminReview(reviewState(), {
      action: "manual_adjustment",
      adminId: "admin-1",
      adminName: "Alice",
      adjustmentAmount: -200,
      reason: "All content was invalid after review.",
      now: "2026-05-26T10:00:00.000Z",
    });

    expect(result.state.finalConfirmedAmount).toBe(0);
  });

  it("only marks approved submissions as paid", () => {
    expect(() =>
      applyAdminReview(reviewState({ status: "submitted" }), {
        action: "mark_paid",
        adminId: "admin-1",
        adminName: "Alice",
        paymentReference: "wire-123",
        now: "2026-05-26T10:00:00.000Z",
      }),
    ).toThrow("Only approved submissions can be marked as paid.");
  });

  it("marks an approved submission as paid and records payment reference", () => {
    const result = applyAdminReview(reviewState({ status: "approved" }), {
      action: "mark_paid",
      adminId: "admin-1",
      adminName: "Alice",
      paymentReference: "wire-123",
      now: "2026-05-26T10:00:00.000Z",
    });

    expect(result.state.status).toBe("paid");
    expect(result.record.paymentReference).toBe("wire-123");
  });
});
