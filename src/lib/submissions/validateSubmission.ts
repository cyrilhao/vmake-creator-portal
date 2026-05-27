import type {
  CreatorSubmissionDraft,
  ExistingSubmissionSummary,
  SubmissionValidationIssue,
  SubmissionValidationResult,
} from "./submissionTypes";
import type { Platform } from "@/lib/rewards/rewardTypes";

const activeSubmissionStatuses = new Set([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "paid",
]);

const platformHosts: Record<string, string[]> = {
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  pinterest: ["pinterest.com", "pin.it"],
  lemon8: ["lemon8-app.com", "lemon8.com"],
  threads: ["threads.net"],
};

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

  if (!draft.creatorId.trim()) {
    issues.push({
      field: "creatorId",
      message: "Creator is required.",
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
      submission.creatorId === draft.creatorId &&
      submission.rewardMonth === draft.rewardMonth &&
      activeSubmissionStatuses.has(submission.status),
  );

  if (hasActiveDuplicate) {
    issues.push({
      field: "rewardMonth",
      message: "Creator already has a submission for this reward month.",
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

function urlMatchesPlatform(platform: string, url: string) {
  if (!url) {
    return true;
  }

  let hostname: string;

  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  const allowedHosts = platformHosts[platform];

  return allowedHosts
    ? allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    : false;
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
