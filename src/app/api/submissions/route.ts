import { NextResponse } from "next/server";
import { createSubmissionFromCreatorInput } from "@/lib/server/submissionService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createSubmissionFromCreatorInput({
      creatorId: String(body.creatorId ?? ""),
      rewardMonth: String(body.rewardMonth ?? ""),
      bulkInput: String(body.bulkInput ?? ""),
      totalMonthlyViews: Number(body.totalMonthlyViews ?? 0),
      referralDiscordUsernames: Array.isArray(body.referralDiscordUsernames)
        ? body.referralDiscordUsernames.map((value: unknown) => String(value))
        : [],
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          issues: result.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      submissionId: result.submission.id,
      submittedAt: result.submission.submittedAt?.toISOString(),
      contentCount: result.summary.contentCount,
      referralCount: Array.isArray(body.referralDiscordUsernames)
        ? body.referralDiscordUsernames.length
        : 0,
    });
  } catch (error) {
    console.error("Failed to create creator submission", error);
    return NextResponse.json(
      {
        ok: false,
        issues: [
          {
            field: "form",
            message:
              "Submission service is unavailable. Check DATABASE_URL and run Prisma migrations.",
          },
        ],
      },
      { status: 500 },
    );
  }
}
