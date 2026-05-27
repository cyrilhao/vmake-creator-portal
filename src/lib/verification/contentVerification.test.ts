import { describe, expect, it, vi } from "vitest";
import {
  extractXPostId,
  extractYouTubeVideoId,
  verifyContentItemViews,
} from "./contentVerification";

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://youtu.be/abc123", "abc123"],
    ["https://www.youtube.com/watch?v=abc123", "abc123"],
    ["https://www.youtube.com/shorts/abc123", "abc123"],
    ["https://www.youtube.com/embed/abc123", "abc123"],
  ])("extracts %s", (url, expected) => {
    expect(extractYouTubeVideoId(url)).toBe(expected);
  });
});

describe("extractXPostId", () => {
  it.each([
    ["https://x.com/vmake/status/1234567890", "1234567890"],
    ["https://twitter.com/vmake/status/1234567890", "1234567890"],
  ])("extracts %s", (url, expected) => {
    expect(extractXPostId(url)).toBe(expected);
  });
});

describe("verifyContentItemViews", () => {
  it("verifies YouTube views when the API returns statistics", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ statistics: { viewCount: "12345" } }],
      }),
    });

    const result = await verifyContentItemViews(
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=abc123",
      },
      {
        fetchImpl,
        youtubeApiKey: "yt-key",
      },
    );

    expect(result.status).toBe("verified");
    expect(result.source).toBe("youtube_api");
    expect(result.verifiedViews).toBe(12345);
    expect(result.externalContentId).toBe("abc123");
  });

  it("marks YouTube verification unavailable without an API key", async () => {
    const result = await verifyContentItemViews({
      platform: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("YOUTUBE_API_KEY");
  });

  it("verifies X video views when media metrics are returned", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        includes: {
          media: [
            {
              type: "video",
              public_metrics: {
                view_count: 9876,
              },
            },
          ],
        },
      }),
    });

    const result = await verifyContentItemViews(
      {
        platform: "x",
        url: "https://x.com/vmake/status/1234567890",
      },
      {
        fetchImpl,
        xBearerToken: "x-token",
      },
    );

    expect(result.status).toBe("verified");
    expect(result.source).toBe("x_api");
    expect(result.verifiedViews).toBe(9876);
    expect(result.externalContentId).toBe("1234567890");
  });

  it("marks X verification unavailable when no video metrics exist", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        includes: {
          media: [
            {
              type: "photo",
            },
          ],
        },
      }),
    });

    const result = await verifyContentItemViews(
      {
        platform: "x",
        url: "https://x.com/vmake/status/1234567890",
      },
      {
        fetchImpl,
        xBearerToken: "x-token",
      },
    );

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("did not return video view metrics");
  });

  it("marks unsupported platforms unavailable", async () => {
    const result = await verifyContentItemViews({
      platform: "instagram",
      url: "https://www.instagram.com/reel/abc",
    });

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("Instagram");
  });
});
