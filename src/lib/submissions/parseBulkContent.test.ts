import { describe, expect, it } from "vitest";
import { parseBulkContentInput } from "./parseBulkContent";

describe("parseBulkContentInput", () => {
  it("parses comma-separated bulk content rows", () => {
    const result = parseBulkContentInput(
      [
        "TikTok, https://www.tiktok.com/@vmake/video/1, 12000, 2026-05-10",
        "Instagram, https://www.instagram.com/reel/abc, 8,900, 2026-05-14",
      ].join("\n"),
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        platform: "tiktok",
        url: "https://www.tiktok.com/@vmake/video/1",
        monthlyViews: "12000",
        publishedAt: "2026-05-10",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/reel/abc",
        monthlyViews: "8900",
        publishedAt: "2026-05-14",
      },
    ]);
  });

  it("parses tab-separated rows and fills a default date when missing", () => {
    const result = parseBulkContentInput(
      "YouTube\thttps://youtu.be/abc\t50000",
      "2026-05",
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([
      {
        platform: "youtube",
        url: "https://youtu.be/abc",
        monthlyViews: "50000",
        publishedAt: "2026-05-01",
      },
    ]);
  });

  it("reports unsupported platforms and short lines", () => {
    const result = parseBulkContentInput(
      ["Unknown, https://example.com, 1000", "TikTok, https://tiktok.com"].join("\n"),
      "2026-05",
    );

    expect(result.rows).toEqual([]);
    expect(result.issues).toEqual([
      {
        line: 1,
        message: 'Unsupported platform "Unknown".',
      },
      {
        line: 2,
        message: "Use platform, link, views, and optional published date.",
      },
    ]);
  });
});
