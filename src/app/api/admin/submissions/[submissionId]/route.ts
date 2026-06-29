import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      submissionId: string;
    }>;
  },
) {
  try {
    const { submissionId } = await context.params;

    await prisma.$transaction(async (tx) => {
      await tx.adminReviewRecord.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.rewardCalculationResult.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.submissionPlatformProof.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.submissionReferral.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.contentItem.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.payout.deleteMany({
        where: {
          submissionId,
        },
      });
      await tx.submission.delete({
        where: {
          id: submissionId,
        },
      });
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to delete submission.",
      },
      { status: 400 },
    );
  }
}
