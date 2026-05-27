import { Prisma } from "@prisma/client";
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

export type CreatorSubmissionPayload = {
  creatorId: string;
  rewardMonth: string;
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
  const parsed = parseBulkContentInput(input.bulkInput, input.rewardMonth);
  const issues: SubmissionValidationIssue[] = parsed.issues.map((issue) => ({
    field: `bulkInput.line${issue.line}`,
    message: issue.message,
  }));

  const rewardMonthDate = parseRewardMonth(input.rewardMonth);

  if (!rewardMonthDate) {
    issues.push({
      field: "rewardMonth",
      message: "Reward month must use YYYY-MM format.",
    });
  }

  if (!Number.isInteger(input.totalMonthlyViews) || input.totalMonthlyViews < 0) {
    issues.push({
      field: "totalMonthlyViews",
      message: "Monthly total views must be zero or greater.",
    });
  }

  const existingSubmissions = await loadExistingSubmissionSummaries(input.creatorId);
  const draft = {
    creatorId: input.creatorId,
    rewardMonth: input.rewardMonth,
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

  const creator = await upsertCreator(input.creatorId);
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
      rewardMonth: rewardMonthDate,
      creatorReportedTotalViews: input.totalMonthlyViews,
      status: "submitted",
      submittedAt: new Date(),
      contentItems: {
        create: parsed.rows.map((row) => ({
          platform: row.platform,
          url: row.url,
          publishedAt: new Date(`${row.publishedAt}T00:00:00.000Z`),
          monthlyViews: 0,
          creatorReportedViews: 0,
          status: "pending",
        })),
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

export async function listAdminSubmissions() {
  try {
    const submissions = await prisma.submission.findMany({
      orderBy: [
        { submittedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        creator: true,
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
          submission.creator.handle ?? `@${submission.creator.externalCreatorId}`,
        monthLabel: formatRewardMonth(submission.rewardMonth),
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
  externalCreatorId: string,
): Promise<ExistingSubmissionSummary[]> {
  const creator = await prisma.creator.findUnique({
    where: {
      externalCreatorId,
    },
    include: {
      submissions: {
        select: {
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
    creatorId: externalCreatorId,
    rewardMonth: toRewardMonthKey(submission.rewardMonth),
    status: submission.status,
  }));
}

async function upsertCreator(externalCreatorId: string) {
  return prisma.creator.upsert({
    where: {
      externalCreatorId,
    },
    update: {
      handle: externalCreatorId,
      name: externalCreatorId,
    },
    create: {
      externalCreatorId,
      handle: externalCreatorId,
      name: externalCreatorId,
      email: `${sanitizeExternalId(externalCreatorId)}@creator.local`,
    },
  });
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
