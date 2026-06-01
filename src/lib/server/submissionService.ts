import { Prisma } from "@prisma/client";
import type { AdminSubmissionListItem } from "@/lib/admin/adminTypes";
import { prisma } from "@/lib/prisma";
import type { Platform } from "@/lib/rewards/rewardTypes";
import { calculateSubmissionReward } from "@/lib/rewards/calculateReward";
import { vmakeCreatorProgramRulesV1 } from "@/lib/rewards/vmakeRules";
import { parseBulkContentInput, summarizeBulkContent } from "@/lib/submissions/parseBulkContent";
import type {
  ExistingSubmissionSummary,
  SubmissionValidationIssue,
} from "@/lib/submissions/submissionTypes";
import { validateCreatorSubmission } from "@/lib/submissions/validateSubmission";
import { verifySubmissionContentItems } from "@/lib/verification/contentVerification";

export type CreatorSubmissionPayload = {
  creatorDiscordId: string;
  creatorDiscordUsername?: string;
  creatorFullName: string;
  paypalEmail: string;
  campaignId: string;
  bulkInput: string;
  totalMonthlyViews: number;
  referralDiscordUsernames?: string[];
  platformProofs?: Array<{
    platform: Platform;
    blobUrl: string;
    filename: string;
    contentType?: string;
    sizeBytes?: number;
  }>;
};

export async function createSubmissionFromCreatorInput(input: CreatorSubmissionPayload) {
  const campaign = await prisma.campaign.findUnique({
    where: {
      id: input.campaignId,
    },
  });
  const rewardMonth = campaign?.rewardMonth ?? "";
  const parsed = parseBulkContentInput(input.bulkInput, rewardMonth);
  const issues: SubmissionValidationIssue[] = parsed.issues.map((issue) => ({
    field: `bulkInput.line${issue.line}`,
    message: issue.message,
  }));

  const rewardMonthDate = parseRewardMonth(rewardMonth);

  if (!campaign) {
    issues.push({
      field: "campaignId",
      message: "Selected campaign is not available.",
    });
  }

  if (!rewardMonthDate) {
    issues.push({
      field: "rewardMonth",
      message: "Campaign reward month must use YYYY-MM format.",
    });
  }

  if (!Number.isInteger(input.totalMonthlyViews) || input.totalMonthlyViews < 0) {
    issues.push({
      field: "totalMonthlyViews",
      message: "Monthly total views must be zero or greater.",
    });
  }

  const existingSubmissions = await loadExistingSubmissionSummaries(input.creatorDiscordId);
  const draft = {
    creatorDiscordId: input.creatorDiscordId,
    creatorFullName: input.creatorFullName,
    paypalEmail: input.paypalEmail,
    campaignId: input.campaignId,
    campaignName: campaign?.name ?? "",
    rewardMonth,
    status: "submitted" as const,
    referralDiscordUsernames: input.referralDiscordUsernames,
    platformProofs: input.platformProofs,
    contentItems: parsed.rows.map((row) => ({
      platform: row.platform,
      url: row.url,
      publishedAt: row.publishedAt,
      monthlyViews: 0,
      status: "pending" as const,
    })),
  };

  const validation = validateCreatorSubmission(draft, existingSubmissions);
  issues.push(...validation.issues);

  if (issues.length > 0 || !rewardMonthDate) {
    return {
      ok: false as const,
      issues,
    };
  }

  const creator = await upsertCreator({
    discordUserId: input.creatorDiscordId,
    discordUsername: input.creatorDiscordUsername,
    fullName: input.creatorFullName,
    paypalEmail: input.paypalEmail,
  });
  const verificationResults = await verifySubmissionContentItems(
    parsed.rows.map((row) => ({
      platform: row.platform,
      url: row.url,
    })),
    {
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      xBearerToken: process.env.X_BEARER_TOKEN,
    },
  );
  const hasPreviousValidPost = await prisma.submission.count({
    where: {
      creatorId: creator.id,
      status: {
        in: ["approved", "paid", "under_review", "submitted"],
      },
    },
  });
  const summary = summarizeBulkContent(parsed.rows);
  const rewardResult = calculateSubmissionReward(
    {
      creatorId: creator.id,
      submissionId: `local-${Date.now()}`,
      status: "submitted",
      hasPreviousValidPost: hasPreviousValidPost > 0,
      totalViewsOverride: input.totalMonthlyViews,
      contentItems: parsed.rows.map((row, index) => ({
        id: `content-${index + 1}`,
        platform: row.platform,
        url: row.url,
        monthlyViews: 0,
        status: "valid",
      })),
      referrals: (input.referralDiscordUsernames ?? []).map((username) => ({
        id: username,
        discordUsername: username,
        status: "pending",
      })),
    },
    vmakeCreatorProgramRulesV1,
  );

  const systemAdmin = await ensureSystemAdmin();
  const rewardRuleVersion = await ensureRewardRuleVersion(systemAdmin.id);

  const submission = await prisma.submission.create({
    data: {
      creatorId: creator.id,
      campaignId: campaign?.id,
      rewardMonth: rewardMonthDate,
      creatorReportedTotalViews: input.totalMonthlyViews,
      status: "submitted",
      submittedAt: new Date(),
      contentItems: {
        create: parsed.rows.map((row, index) => {
          const verification = verificationResults[index];

          return {
            platform: row.platform,
            url: row.url,
            externalContentId: verification?.externalContentId ?? null,
            publishedAt: new Date(`${row.publishedAt}T00:00:00.000Z`),
            monthlyViews: 0,
            creatorReportedViews: 0,
            autoVerifiedViews: verification?.verifiedViews ?? null,
            verificationStatus: verification?.status ?? "pending",
            verificationSource: verification?.source ?? null,
            verificationError: verification?.error ?? null,
            verificationCheckedAt: verification?.checkedAt
              ? new Date(verification.checkedAt)
              : null,
            status: "pending",
          };
        }),
      },
      referrals: {
        create: (input.referralDiscordUsernames ?? []).map((discordUsername) => ({
          discordUsername,
          status: "pending",
        })),
      },
      platformProofs: {
        create: (input.platformProofs ?? []).map((proof) => ({
          platform: proof.platform,
          blobUrl: proof.blobUrl,
          filename: proof.filename,
          contentType: proof.contentType,
          sizeBytes: proof.sizeBytes,
        })),
      },
      calculationResults: {
        create: {
          rewardRuleVersionId: rewardRuleVersion.id,
          calculatedAmount: decimal(rewardResult.estimatedAmountBeforeCap),
          cappedAmount: rewardResult.capApplied
            ? decimal(rewardResult.estimatedAmount)
            : null,
          finalEstimatedAmount: decimal(rewardResult.estimatedAmount),
          currency: rewardResult.currency,
          calculationInputJson: {
            totalMonthlyViews: input.totalMonthlyViews,
            contentCount: summary.contentCount,
            referralDiscordUsernames: input.referralDiscordUsernames ?? [],
          } as Prisma.InputJsonValue,
          calculationBreakdownJson: {
            lineItems: rewardResult.lineItems,
            platformBreakdown: rewardResult.platformBreakdown,
            platformContentCounts: rewardResult.platformContentCounts,
          } as Prisma.InputJsonValue,
        },
      },
    },
    include: {
      contentItems: true,
      referrals: true,
      platformProofs: true,
      calculationResults: {
        orderBy: {
          calculatedAt: "desc",
        },
        take: 1,
      },
      creator: true,
    },
  });

  return {
    ok: true as const,
    submission,
    rewardResult,
    summary,
  };
}

export async function listAdminSubmissions(): Promise<AdminSubmissionListItem[]> {
  try {
    const submissions = await prisma.submission.findMany({
      orderBy: [
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        creator: true,
        campaign: true,
        contentItems: {
          orderBy: {
            createdAt: "asc",
          },
        },
        referrals: {
          orderBy: {
            createdAt: "asc",
          },
        },
        platformProofs: {
          orderBy: {
            createdAt: "asc",
          },
        },
        calculationResults: {
          orderBy: {
            calculatedAt: "desc",
          },
          take: 1,
        },
        payout: true,
      },
    });

    return submissions.map((submission) => {
      const latestCalculation = submission.calculationResults[0];
      const inputJson = asRecord(latestCalculation?.calculationInputJson);
      const breakdownJson = asRecord(latestCalculation?.calculationBreakdownJson);
      const platformContentCounts = asRecord(breakdownJson.platformContentCounts);
      const uniquePlatforms = Object.entries(platformContentCounts)
        .filter(([, count]) => Number(count) > 0)
        .map(([platform]) => platformLabel(platform));

      return {
        id: submission.id,
        creatorName: submission.creator.name,
        creatorHandle:
          submission.creator.handle ??
          `@${submission.creator.discordUsername ?? submission.creator.externalCreatorId ?? "creator"}`,
        creatorDiscordId:
          submission.creator.discordUserId ?? submission.creator.externalCreatorId ?? "",
        creatorEmail: submission.creator.email,
        campaignId: submission.campaignId,
        campaignName: submission.campaign?.name ?? formatRewardMonth(submission.rewardMonth),
        monthLabel: submission.campaign?.name ?? formatRewardMonth(submission.rewardMonth),
        rewardMonthKey: toRewardMonthKey(submission.rewardMonth),
        status: submission.status,
        posts: submission.contentItems.length,
        totalViews: submission.creatorReportedTotalViews,
        platforms: uniquePlatforms,
        systemEstimatedAmount: latestCalculation
          ? Number(latestCalculation.finalEstimatedAmount)
          : 0,
        finalConfirmedAmount: submission.payout
          ? Number(submission.payout.finalConfirmedAmount)
          : null,
        currency: latestCalculation?.currency ?? "USD",
        submittedAt:
          submission.submittedAt?.toISOString() ?? submission.createdAt.toISOString(),
        contentItems: submission.contentItems.map((item) => ({
          id: item.id,
          platform: platformLabel(item.platform),
          url: item.url,
          autoVerifiedViews: item.autoVerifiedViews,
          adminVerifiedViews: item.adminVerifiedViews,
          verificationStatus: item.verificationStatus,
          verificationSource: item.verificationSource,
          verificationError: item.verificationError,
          status: item.status,
          publishedAt: item.publishedAt.toISOString(),
        })),
        referrals: submission.referrals.map((referral) => ({
          id: referral.id,
          discordUsername: referral.discordUsername,
          status: referral.status,
        })),
        platformProofs: submission.platformProofs.map((proof) => ({
          id: proof.id,
          platform: platformLabel(proof.platform),
          url: proof.blobUrl,
          filename: proof.filename,
        })),
        platformContentCounts,
        rewardBreakdown: asArray(breakdownJson.lineItems),
        rewardInput: inputJson,
      };
    });
  } catch (error) {
    console.error("Failed to load admin submissions", error);
    return [];
  }
}

async function loadExistingSubmissionSummaries(
  creatorDiscordId: string,
): Promise<ExistingSubmissionSummary[]> {
  const creator = await prisma.creator.findUnique({
    where: {
      discordUserId: creatorDiscordId,
    },
    include: {
      submissions: {
        select: {
          campaignId: true,
          creatorId: true,
          rewardMonth: true,
          status: true,
        },
      },
    },
  });

  if (!creator) {
    return [];
  }

  return creator.submissions.map((submission) => ({
    creatorDiscordId,
    campaignId: submission.campaignId ?? undefined,
    rewardMonth: toRewardMonthKey(submission.rewardMonth),
    status: submission.status,
  }));
}

async function upsertCreator({
  discordUserId,
  discordUsername,
  fullName,
  paypalEmail,
}: {
  discordUserId: string;
  discordUsername?: string;
  fullName: string;
  paypalEmail: string;
}) {
  return prisma.creator.upsert({
    where: {
      discordUserId,
    },
    update: {
      externalCreatorId: discordUserId,
      discordUsername,
      handle: discordUsername ? `@${discordUsername}` : `@${discordUserId}`,
      name: fullName,
      email: paypalEmail,
    },
    create: {
      externalCreatorId: discordUserId,
      discordUserId,
      discordUsername,
      handle: discordUsername ? `@${discordUsername}` : `@${discordUserId}`,
      name: fullName,
      email: paypalEmail,
    },
  });
}

export async function listCreatorSubmissions(creatorDiscordId: string) {
  if (!creatorDiscordId) {
    return [];
  }

  const creator = await prisma.creator.findUnique({
    where: {
      discordUserId: creatorDiscordId,
    },
    include: {
      submissions: {
        orderBy: [
          { submittedAt: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          campaign: true,
          contentItems: {
            orderBy: {
              createdAt: "asc",
            },
          },
          platformProofs: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!creator) {
    return [];
  }

  return creator.submissions.map((submission) => ({
    id: submission.id,
    campaignName: submission.campaign?.name ?? formatRewardMonth(submission.rewardMonth),
    rewardMonthKey: toRewardMonthKey(submission.rewardMonth),
    status: submission.status,
    submittedAt:
      submission.submittedAt?.toISOString() ?? submission.createdAt.toISOString(),
    totalViews: submission.creatorReportedTotalViews,
    contentCount: submission.contentItems.length,
    platforms: Array.from(new Set(submission.contentItems.map((item) => platformLabel(item.platform)))),
    contentItems: submission.contentItems.map((item) => ({
      id: item.id,
      platform: platformLabel(item.platform),
      url: item.url,
      publishedAt: item.publishedAt.toISOString(),
    })),
    proofCount: submission.platformProofs.length,
  }));
}

async function ensureSystemAdmin() {
  return prisma.adminUser.upsert({
    where: {
      email: "system@vmake.local",
    },
    update: {
      name: "System Admin",
    },
    create: {
      name: "System Admin",
      email: "system@vmake.local",
      role: "admin",
    },
  });
}

async function ensureRewardRuleVersion(createdByAdminId: string) {
  return prisma.rewardRuleVersion.upsert({
    where: {
      name_version: {
        name: "Vmake Creator Program",
        version: vmakeCreatorProgramRulesV1.version,
      },
    },
    update: {
      configJson: vmakeCreatorProgramRulesV1 as unknown as Prisma.InputJsonValue,
      status: "active",
      effectiveFrom: parseRewardMonth("2026-05") ?? new Date("2026-05-01T00:00:00.000Z"),
    },
    create: {
      name: "Vmake Creator Program",
      version: vmakeCreatorProgramRulesV1.version,
      status: "active",
      effectiveFrom: parseRewardMonth("2026-05") ?? new Date("2026-05-01T00:00:00.000Z"),
      configJson: vmakeCreatorProgramRulesV1 as unknown as Prisma.InputJsonValue,
      createdByAdminId,
    },
  });
}

function parseRewardMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}-01T00:00:00.000Z`);
}

function toRewardMonthKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatRewardMonth(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function sanitizeExternalId(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return normalized || `creator-${Date.now()}`;
}

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function platformLabel(platform: string) {
  if (platform === "x") {
    return "X";
  }

  if (platform === "lemon8") {
    return "Lemon8";
  }

  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}
