import type {
  CreatorSubmissionDraft,
  ExistingSubmissionSummary,
  SubmissionValidationIssue,
  SubmissionValidationResult,
} from "./submissionTypes";
import type { Platform } from "@/lib/rewards/rewardTypes";
import { urlMatchesPlatform } from "./platformUrlDetection";

const activeSubmissionStatuses = new Set([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "paid",
]);

export function validateCreatorSubmission(
  draft: CreatorSubmissionDraft,
  existingSubmissions: ExistingSubmissionSummary[],
): SubmissionValidationResult {
  const issues: SubmissionValidationIssue[] = [];
  const usedPlatforms = new Set<Platform>();
  const proofPlatforms = new Set<Platform>(
    (draft.platformProofs ?? [])
      .filter((proof) => proof.blobUrl.trim() && proof.filename.trim())
      .map((proof) => proof.platform),
  );

  if (!draft.creatorDiscordId.trim()) {
    issues.push({
      field: "creatorDiscordId",
      message: "Discord account is required.",
    });
  }

  if (!draft.campaignId.trim()) {
    issues.push({
      field: "campaignId",
      message: "Campaign is required.",
    });
  }

  if (!draft.campaignName.trim()) {
    issues.push({
      field: "campaignName",
      message: "Campaign name is required.",
    });
  }

  if (!draft.creatorFullName.trim()) {
    issues.push({
      field: "creatorFullName",
      message: "Full name is required.",
    });
  }

  if (!isValidEmail(draft.paypalEmail)) {
    issues.push({
      field: "paypalEmail",
      message: "PayPal email must be a valid email address.",
    });
  }

  if (!isRewardMonth(draft.rewardMonth)) {
    issues.push({
      field: "rewardMonth",
      message: "Reward month must use YYYY-MM format.",
    });
  }

  const hasActiveDuplicate = existingSubmissions.some(
    (submission) =>
      submission.creatorDiscordId === draft.creatorDiscordId &&
      ((draft.campaignId && submission.campaignId === draft.campaignId) ||
        submission.rewardMonth === draft.rewardMonth) &&
      activeSubmissionStatuses.has(submission.status),
  );

  if (hasActiveDuplicate) {
    issues.push({
      field: "campaignId",
      message: "Creator already has a submission for this campaign.",
    });
  }

  const seenUrls = new Set<string>();

  draft.contentItems.forEach((contentItem, index) => {
    const url = normalizeUrl(contentItem.url);
    usedPlatforms.add(contentItem.platform);

    if (!url) {
      issues.push({
        field: `contentItems[${index}].url`,
        message: "Content URL is required.",
      });
    }

    if (url && seenUrls.has(url)) {
      issues.push({
        field: `contentItems[${index}].url`,
        message: "Content URL is duplicated in this submission.",
      });
    }

    if (url) {
      seenUrls.add(url);
    }

    if (!urlMatchesPlatform(contentItem.platform, url)) {
      issues.push({
        field: `contentItems[${index}].url`,
        message: "Content URL does not match the selected platform.",
      });
    }

    if (!Number.isInteger(contentItem.monthlyViews) || contentItem.monthlyViews < 0) {
      issues.push({
        field: `contentItems[${index}].monthlyViews`,
        message: "Monthly views must be zero or greater.",
      });
    }

    if (!isDateInRewardMonth(contentItem.publishedAt, draft.rewardMonth)) {
      issues.push({
        field: `contentItems[${index}].publishedAt`,
        message: "Published date must fall within the reward month.",
      });
    }
  });

  draft.referralDiscordUsernames?.forEach((username, index) => {
    if (!isValidDiscordUsername(username)) {
      issues.push({
        field: `referralDiscordUsernames[${index}]`,
        message: "Referral Discord username is not valid.",
      });
    }
  });

  usedPlatforms.forEach((platform) => {
    if (!proofPlatforms.has(platform)) {
      issues.push({
        field: `platformProofs.${platform}`,
        message: `Upload an analytics screenshot for ${platformLabel(platform)} content.`,
      });
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

function isRewardMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isDateInRewardMonth(dateValue: string, rewardMonth: string) {
  if (!isRewardMonth(rewardMonth)) {
    return false;
  }

  const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const [year, month] = rewardMonth.split("-").map(Number);

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() + 1 === month
  );
}

function isValidDiscordUsername(username: string) {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return false;
  }

  return /^[a-zA-Z0-9._]{2,32}(#[0-9]{4})?$/.test(trimmedUsername);
}

function isValidEmail(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue);
}

function platformLabel(platform: string) {
  if (platform === "x") {
    return "X";
  }

  if (platform === "lemon8") {
    return "Lemon8";
  }

  if (platform === "tiktok") {
    return "TikTok";
  }

  return platform.charAt(0).toUpperCase() + platform.slice(1);
}
