import { describe, expect, it } from "vitest";
import { parseBulkContentInput, summarizeBulkContent } from "./parseBulkContent";

describe("parseBulkContentInput", () => {
  it("parses one URL per line and detects platform automatically", () => {
    const result = parseBulkContentInput(
      [
        "https://www.tiktok.com/@vmake/video/1",
        "https://www.instagram.com/reel/abc",
      ].join("\n"),
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        platform: "tiktok",
        url: "https://www.tiktok.com/@vmake/video/1",
        publishedAt: "2026-05-01",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/reel/abc",
        publishedAt: "2026-05-01",
      },
    ]);
  });

  it("accepts an optional published date after the URL", () => {
    const result = parseBulkContentInput(
      "https://youtu.be/abc, 2026-05-09",
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        platform: "youtube",
        url: "https://youtu.be/abc",
        publishedAt: "2026-05-09",
      },
    ]);
  });

  it("reports unsupported URLs", () => {
    const result = parseBulkContentInput(
      "https://example.com/post/1",
      "2026-05",
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      {
        line: 1,
        message: "URL must be from X, Instagram, TikTok, YouTube, Pinterest, Lemon8, or Threads.",
      },
    ]);
  });

  it("summarizes content count and platform counts for admin-side use", () => {
    const parsed = parseBulkContentInput(
      [
        "https://x.com/vmake/status/123",
        "https://www.instagram.com/reel/abc",
        "https://www.instagram.com/reel/xyz",
      ].join("\n"),
      "2026-05",
    );

    expect(summarizeBulkContent(parsed.rows)).toEqual({
      contentCount: 3,
      platformContentCounts: {
        x: 1,
        instagram: 2,
        tiktok: 0,
        youtube: 0,
        pinterest: 0,
        lemon8: 0,
        threads: 0,
      },
    });
  });
});
