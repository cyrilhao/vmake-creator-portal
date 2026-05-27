import { describe, expect, it } from "vitest";
import { validateCreatorSubmission } from "./validateSubmission";
import type { CreatorSubmissionDraft } from "./submissionTypes";

const draft = (
  overrides: Partial<CreatorSubmissionDraft> = {},
): CreatorSubmissionDraft => ({
  creatorId: overrides.creatorId ?? "creator-1",
  rewardMonth: overrides.rewardMonth ?? "2026-05",
  status: overrides.status ?? "draft",
  referralDiscordUsernames: overrides.referralDiscordUsernames,
  platformProofs: overrides.platformProofs ?? [
    {
      platform: "tiktok",
      blobUrl: "https://blob.example/tiktok-proof.png",
      filename: "tiktok-proof.png",
    },
  ],
  contentItems: overrides.contentItems ?? [
    {
      platform: "tiktok",
      url: "https://www.tiktok.com/@vmake/video/1",
      publishedAt: "2026-05-10",
      monthlyViews: 1000,
    },
  ],
});

describe("validateCreatorSubmission", () => {
  it("accepts a valid monthly creator submission draft", () => {
    const result = validateCreatorSubmission(draft(), []);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("requires a platform analytics screenshot for each used platform", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "tiktok",
            url: "https://www.tiktok.com/@vmake/video/1",
            publishedAt: "2026-05-10",
            monthlyViews: 1000,
          },
          {
            platform: "instagram",
            url: "https://www.instagram.com/reel/abc",
            publishedAt: "2026-05-11",
            monthlyViews: 1000,
          },
        ],
        platformProofs: [
          {
            platform: "tiktok",
            blobUrl: "https://blob.example/tiktok-proof.png",
            filename: "tiktok-proof.png",
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "platformProofs.instagram",
      message: "Upload an analytics screenshot for Instagram content.",
    });
  });

  it("accepts submissions when each used platform has a screenshot proof", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "tiktok",
            url: "https://www.tiktok.com/@vmake/video/1",
            publishedAt: "2026-05-10",
            monthlyViews: 1000,
          },
          {
            platform: "instagram",
            url: "https://www.instagram.com/reel/abc",
            publishedAt: "2026-05-11",
            monthlyViews: 1000,
          },
        ],
        platformProofs: [
          {
            platform: "tiktok",
            blobUrl: "https://blob.example/tiktok-proof.png",
            filename: "tiktok-proof.png",
          },
          {
            platform: "instagram",
            blobUrl: "https://blob.example/instagram-proof.png",
            filename: "instagram-proof.png",
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(true);
  });

  it("rejects a duplicate submission for the same creator and month", () => {
    const result = validateCreatorSubmission(draft(), [
      {
        creatorId: "creator-1",
        rewardMonth: "2026-05",
        status: "submitted",
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "rewardMonth",
      message: "Creator already has a submission for this reward month.",
    });
  });

  it("allows replacing an existing rejected submission for the same month", () => {
    const result = validateCreatorSubmission(draft(), [
      {
        creatorId: "creator-1",
        rewardMonth: "2026-05",
        status: "rejected",
      },
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects duplicate content URLs within one submission", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "tiktok",
            url: "https://www.tiktok.com/@vmake/video/1",
            publishedAt: "2026-05-10",
            monthlyViews: 1000,
          },
          {
            platform: "instagram",
            url: "https://www.tiktok.com/@vmake/video/1",
            publishedAt: "2026-05-11",
            monthlyViews: 2000,
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "contentItems[1].url",
      message: "Content URL is duplicated in this submission.",
    });
  });

  it("rejects content with negative monthly views", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "youtube",
            url: "https://www.youtube.com/watch?v=abc",
            publishedAt: "2026-05-10",
            monthlyViews: -1,
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "contentItems[0].monthlyViews",
      message: "Monthly views must be zero or greater.",
    });
  });

  it("rejects content published outside the reward month", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "tiktok",
            url: "https://www.tiktok.com/@vmake/video/1",
            publishedAt: "2026-04-30",
            monthlyViews: 1000,
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "contentItems[0].publishedAt",
      message: "Published date must fall within the reward month.",
    });
  });

  it("rejects unsupported platform URLs", () => {
    const result = validateCreatorSubmission(
      draft({
        contentItems: [
          {
            platform: "instagram",
            url: "https://www.youtube.com/watch?v=abc",
            publishedAt: "2026-05-10",
            monthlyViews: 1000,
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "contentItems[0].url",
      message: "Content URL does not match the selected platform.",
    });
  });

  it.each([
    ["x", "https://x.com/vmake/status/123"],
    ["x", "https://twitter.com/vmake/status/123"],
    ["instagram", "https://www.instagram.com/reel/abc"],
    ["tiktok", "https://www.tiktok.com/@vmake/video/1"],
    ["youtube", "https://youtu.be/abc"],
    ["pinterest", "https://www.pinterest.com/pin/123"],
    ["pinterest", "https://pin.it/abc"],
    ["lemon8", "https://www.lemon8-app.com/post/123"],
    ["threads", "https://www.threads.net/@vmake/post/123"],
  ] as const)("accepts %s content URLs", (platform, url) => {
    const result = validateCreatorSubmission(
      draft({
        platformProofs: [
          {
            platform,
            blobUrl: `https://blob.example/${platform}-proof.png`,
            filename: `${platform}-proof.png`,
          },
        ],
        contentItems: [
          {
            platform,
            url,
            publishedAt: "2026-05-10",
            monthlyViews: 1000,
          },
        ],
      }),
      [],
    );

    expect(result.valid).toBe(true);
  });

  it("accepts valid referral Discord usernames", () => {
    const result = validateCreatorSubmission(
      draft({
        referralDiscordUsernames: ["creator.one", "creator_two#1234"],
      }),
      [],
    );

    expect(result.valid).toBe(true);
  });

  it("rejects invalid referral Discord usernames", () => {
    const result = validateCreatorSubmission(
      draft({
        referralDiscordUsernames: ["", "not allowed!"],
      }),
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      field: "referralDiscordUsernames[0]",
      message: "Referral Discord username is not valid.",
    });
    expect(result.issues).toContainEqual({
      field: "referralDiscordUsernames[1]",
      message: "Referral Discord username is not valid.",
    });
  });
});
