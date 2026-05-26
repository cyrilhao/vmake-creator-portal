import { describe, expect, it } from "vitest";
import { validateCreatorSubmission } from "./validateSubmission";
import type { CreatorSubmissionDraft } from "./submissionTypes";

const draft = (
  overrides: Partial<CreatorSubmissionDraft> = {},
): CreatorSubmissionDraft => ({
  creatorId: overrides.creatorId ?? "creator-1",
  rewardMonth: overrides.rewardMonth ?? "2026-05",
  status: overrides.status ?? "draft",
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
});
