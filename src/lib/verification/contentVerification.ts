import type { Platform } from "@/lib/rewards/rewardTypes";

export type VerificationStatus = "pending" | "verified" | "unavailable" | "failed";
export type VerificationSource = "youtube_api" | "x_api" | "creator_screenshot" | "admin_review";

export type VerificationRequest = {
  platform: Platform;
  url: string;
};

export type VerificationResult = {
  platform: Platform;
  url: string;
  externalContentId: null | string;
  verifiedViews: null | number;
  status: VerificationStatus;
  source: null | VerificationSource;
  checkedAt: string;
  error: null | string;
};

type FetchLike = typeof fetch;

export async function verifyContentItemViews(
  input: VerificationRequest,
  options: {
    fetchImpl?: FetchLike;
    youtubeApiKey?: string;
    xBearerToken?: string;
  } = {},
): Promise<VerificationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();

  if (input.platform === "youtube") {
    const videoId = extractYouTubeVideoId(input.url);

    if (!videoId) {
      return failureResult(input, checkedAt, "Could not parse YouTube video ID.");
    }

    if (!options.youtubeApiKey) {
      return unavailableResult(input, checkedAt, videoId, "YOUTUBE_API_KEY is not configured.");
    }

    try {
      const response = await fetchImpl(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(options.youtubeApiKey)}`,
      );

      if (!response.ok) {
        return failureResult(
          input,
          checkedAt,
          `YouTube API returned ${response.status}.`,
          videoId,
        );
      }

      const payload = (await response.json()) as {
        items?: Array<{
          statistics?: {
            viewCount?: string;
          };
        }>;
      };

      const viewCount = Number(payload.items?.[0]?.statistics?.viewCount);

      if (!Number.isFinite(viewCount)) {
        return failureResult(
          input,
          checkedAt,
          "YouTube API did not return a valid view count.",
          videoId,
        );
      }

      return {
        platform: input.platform,
        url: input.url,
        externalContentId: videoId,
        verifiedViews: viewCount,
        status: "verified",
        source: "youtube_api",
        checkedAt,
        error: null,
      };
    } catch (error) {
      return failureResult(
        input,
        checkedAt,
        error instanceof Error ? error.message : "YouTube verification failed.",
        videoId,
      );
    }
  }

  if (input.platform === "x") {
    const postId = extractXPostId(input.url);

    if (!postId) {
      return failureResult(input, checkedAt, "Could not parse X post ID.");
    }

    if (!options.xBearerToken) {
      return unavailableResult(input, checkedAt, postId, "X_BEARER_TOKEN is not configured.");
    }

    try {
      const response = await fetchImpl(
        `https://api.x.com/2/tweets/${encodeURIComponent(postId)}?expansions=attachments.media_keys&media.fields=public_metrics,type`,
        {
          headers: {
            Authorization: `Bearer ${options.xBearerToken}`,
          },
        },
      );

      if (!response.ok) {
        return failureResult(input, checkedAt, `X API returned ${response.status}.`, postId);
      }

      const payload = (await response.json()) as {
        includes?: {
          media?: Array<{
            type?: string;
            public_metrics?: {
              view_count?: number;
            };
          }>;
        };
      };

      const media = payload.includes?.media?.find((item) =>
        item.type === "video" || item.type === "animated_gif",
      );
      const viewCount = Number(media?.public_metrics?.view_count);

      if (!Number.isFinite(viewCount)) {
        return unavailableResult(
          input,
          checkedAt,
          postId,
          "X API did not return video view metrics for this post.",
        );
      }

      return {
        platform: input.platform,
        url: input.url,
        externalContentId: postId,
        verifiedViews: viewCount,
        status: "verified",
        source: "x_api",
        checkedAt,
        error: null,
      };
    } catch (error) {
      return failureResult(
        input,
        checkedAt,
        error instanceof Error ? error.message : "X verification failed.",
        postId,
      );
    }
  }

  return unavailableResult(
    input,
    checkedAt,
    null,
    `Automatic verification is not available for ${platformLabel(input.platform)} yet.`,
  );
}

export async function verifySubmissionContentItems(
  items: VerificationRequest[],
  options: Parameters<typeof verifyContentItemViews>[1] = {},
) {
  return Promise.all(items.map((item) => verifyContentItemViews(item, options)));
}

export function extractYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const segments = parsed.pathname.split("/").filter(Boolean);

      if (segments[0] === "shorts" || segments[0] === "embed") {
        return segments[1] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractXPostId(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const statusIndex = segments.findIndex((segment) => segment === "status");

    if (statusIndex === -1) {
      return null;
    }

    return segments[statusIndex + 1] ?? null;
  } catch {
    return null;
  }
}

function failureResult(
  input: VerificationRequest,
  checkedAt: string,
  error: string,
  externalContentId: null | string = null,
): VerificationResult {
  return {
    platform: input.platform,
    url: input.url,
    externalContentId,
    verifiedViews: null,
    status: "failed",
    source: null,
    checkedAt,
    error,
  };
}

function unavailableResult(
  input: VerificationRequest,
  checkedAt: string,
  externalContentId: null | string,
  error: string,
): VerificationResult {
  return {
    platform: input.platform,
    url: input.url,
    externalContentId,
    verifiedViews: null,
    status: "unavailable",
    source: null,
    checkedAt,
    error,
  };
}

function platformLabel(platform: Platform) {
  if (platform === "x") {
    return "X";
  }

  if (platform === "tiktok") {
    return "TikTok";
  }

  if (platform === "lemon8") {
    return "Lemon8";
  }

  return platform.charAt(0).toUpperCase() + platform.slice(1);
}
