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

  it("detects mainstream social URL variants by domain keyword", () => {
    const result = parseBulkContentInput(
      [
        "mobile.twitter.com/vmake/status/123",
        "instagr.am/p/abc123",
        "vt.tiktok.com/ZSabc123",
        "m.youtube.com/shorts/xyz789",
        "pin.it/abc123",
        "www.lemon8-app.com/post/123",
        "threads.net/@vmake/post/123",
      ].join("\n"),
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows.map((row) => row.platform)).toEqual([
      "x",
      "instagram",
      "tiktok",
      "youtube",
      "pinterest",
      "lemon8",
      "threads",
    ]);
  });

  it("treats commas inside a URL as part of the URL when no published date is provided", () => {
    const result = parseBulkContentInput(
      [
        "https://example.com/watch?caption=before,after",
        "https://example.com/watch?caption=before,after&v=2",
      ].join("\n"),
      "2026-05",
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      {
        line: 1,
        message: "URL must be from X, Instagram, TikTok, YouTube, Pinterest, Lemon8, or Threads.",
      },
      {
        line: 2,
        message: "URL must be from X, Instagram, TikTok, YouTube, Pinterest, Lemon8, or Threads.",
      },
    ]);
  });

  it("keeps distinct social URLs distinct when they contain commas but no date suffix", () => {
    const result = parseBulkContentInput(
      [
        "https://www.youtube.com/watch?v=abc123&feature=share,list",
        "https://www.youtube.com/watch?v=xyz789&feature=share,list",
      ].join("\n"),
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=abc123&feature=share,list",
        publishedAt: "2026-05-01",
      },
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=xyz789&feature=share,list",
        publishedAt: "2026-05-01",
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

  it("accepts links pasted without a scheme", () => {
    const result = parseBulkContentInput(
      [
        "x.com/vmake/status/123",
        "youtube.com/watch?v=abc123",
        "www.instagram.com/reel/abc123",
      ].join("\n"),
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows.map((row) => row.platform)).toEqual([
      "x",
      "youtube",
      "instagram",
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
