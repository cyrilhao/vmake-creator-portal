import type {
  CreatorSubmissionDraft,
  ExistingSubmissionSummary,
  SubmissionValidationIssue,
  SubmissionValidationResult,
} from "./submissionTypes";

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

  if (!draft.creatorId.trim()) {
    issues.push({
      field: "creatorId",
      message: "Creator is required.",
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

  if (platform === "tiktok") {
    return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
  }

  if (platform === "instagram") {
    return hostname === "instagram.com" || hostname.endsWith(".instagram.com");
  }

  if (platform === "youtube") {
    return (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    );
  }

  return false;
}
