import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSessionCreator, getServerAuthSession } from "@/lib/auth";
import { supportedPlatforms, type Platform } from "@/lib/rewards/rewardTypes";
import { createSubmissionFromCreatorInput } from "@/lib/server/submissionService";

export async function POST(request: Request) {
  try {
    if (
      !process.env.DISCORD_CLIENT_ID ||
      !process.env.DISCORD_CLIENT_SECRET ||
      !process.env.NEXTAUTH_SECRET
    ) {
      return NextResponse.json(
        {
          ok: false,
          issues: [
            {
              field: "creatorDiscordId",
              message: "Discord login is not configured yet.",
            },
          ],
        },
        { status: 503 },
      );
    }

    const session = await getServerAuthSession();
    const creator = getSessionCreator(session);

    if (!creator) {
      return NextResponse.json(
        {
          ok: false,
          issues: [
            {
              field: "creatorDiscordId",
              message: "Sign in with Discord before submitting.",
            },
          ],
        },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return handleMultipartSubmission(request, creator);
    }

    const body = await request.json();
    const result = await createSubmissionFromCreatorInput({
      creatorDiscordId: creator.discordUserId,
      creatorDiscordUsername: creator.discordUsername,
      creatorFullName: String(body.creatorFullName ?? ""),
      paypalEmail: String(body.paypalEmail ?? ""),
      campaignId: String(body.campaignId ?? ""),
      bulkInput: String(body.bulkInput ?? ""),
      totalMonthlyViews: Number(body.totalMonthlyViews ?? 0),
      referralDiscordUsernames: Array.isArray(body.referralDiscordUsernames)
        ? body.referralDiscordUsernames.map((value: unknown) => String(value))
        : [],
      platformProofs: Array.isArray(body.platformProofs)
        ? body.platformProofs
            .map((value: unknown) => normalizePlatformProof(value))
            .filter(Boolean)
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
              "Submission service is unavailable. Check DATABASE_URL, Blob storage, and Prisma migrations.",
          },
        ],
      },
      { status: 500 },
    );
  }
}

async function handleMultipartSubmission(
  request: Request,
  creator: {
    discordUserId: string;
    discordUsername: string;
  },
) {
  const formData = await request.formData();
  const creatorFullName = String(formData.get("creatorFullName") ?? "");
  const paypalEmail = String(formData.get("paypalEmail") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  const bulkInput = String(formData.get("bulkInput") ?? "");
  const totalMonthlyViews = Number(formData.get("totalMonthlyViews") ?? 0);
  const referralDiscordUsernames = parseReferralUsernames(
    String(formData.get("referralDiscordUsernames") ?? "[]"),
  );

  const uploadedProofs = await Promise.all(
    supportedPlatforms.flatMap((platform) => {
      const proofFiles = formData.getAll(`platformProof.${platform}`);

      return proofFiles.flatMap((proofFile, index) => {
        if (!(proofFile instanceof File) || proofFile.size === 0) {
          return [];
        }

        return [
          uploadPlatformProof({
            creatorDiscordId: creator.discordUserId,
            campaignId,
            platform,
            proofFile,
            index,
          }),
        ];
      });
    }),
  );

  const result = await createSubmissionFromCreatorInput({
    creatorDiscordId: creator.discordUserId,
    creatorDiscordUsername: creator.discordUsername,
    creatorFullName,
    paypalEmail,
    campaignId,
    bulkInput,
    totalMonthlyViews,
    referralDiscordUsernames,
    platformProofs: uploadedProofs,
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
    referralCount: referralDiscordUsernames.length,
  });
}

async function uploadPlatformProof({
  creatorDiscordId,
  campaignId,
  platform,
  proofFile,
  index,
}: {
  creatorDiscordId: string;
  campaignId: string;
  platform: Platform;
  proofFile: File;
  index: number;
}) {
  const pathname = [
    "proofs",
    sanitizePathSegment(campaignId || "campaign"),
    sanitizePathSegment(creatorDiscordId || "creator"),
    `${platform}-${index + 1}-${sanitizePathSegment(proofFile.name || "proof")}`,
  ].join("/");

  const blob = await put(pathname, proofFile, {
    access: "public",
    addRandomSuffix: true,
    contentType: proofFile.type || "image/png",
  });

  return {
    platform,
    blobUrl: blob.url,
    filename: proofFile.name || `${platform}-proof`,
    contentType: proofFile.type || "image/png",
    sizeBytes: proofFile.size,
  };
}

function parseReferralUsernames(value: string) {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function normalizePlatformProof(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const proof = value as Record<string, unknown>;
  const platform = String(proof.platform ?? "") as Platform;

  if (!supportedPlatforms.includes(platform)) {
    return null;
  }

  return {
    platform,
    blobUrl: String(proof.blobUrl ?? ""),
    filename: String(proof.filename ?? ""),
    contentType: proof.contentType ? String(proof.contentType) : undefined,
    sizeBytes: Number.isFinite(proof.sizeBytes) ? Number(proof.sizeBytes) : undefined,
  };
}

function sanitizePathSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
