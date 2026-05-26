import type { Platform } from "@/lib/rewards/rewardTypes";

export type BulkContentRowDraft = {
  platform: Platform;
  url: string;
  publishedAt: string;
};

export type BulkParseIssue = {
  line: number;
  message: string;
};

export type BulkParseResult = {
  rows: BulkContentRowDraft[];
  issues: BulkParseIssue[];
};

export type PlatformContentCount = Record<Platform, number>;

const platformHosts: Record<Platform, string[]> = {
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  pinterest: ["pinterest.com", "pin.it"],
  lemon8: ["lemon8-app.com", "lemon8.com"],
  threads: ["threads.net"],
};

export function parseBulkContentInput(input: string, rewardMonth: string): BulkParseResult {
  const issues: BulkParseIssue[] = [];
  const rows: BulkContentRowDraft[] = [];
  const defaultPublishedAt = `${rewardMonth}-01`;

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, lineIndex) => {
    const delimiter = line.includes("\t") ? "\t" : ",";
    const rawCells = line.split(delimiter).map((cell) => cell.trim());
    const cells = rawCells.filter(Boolean);

    if (cells.length < 1) {
      issues.push({
        line: lineIndex + 1,
        message: "Paste one content URL per line, with an optional published date.",
      });
      return;
    }

    const [url, publishedAt = defaultPublishedAt] = cells;
    const platform = detectPlatformFromUrl(url);

    if (!platform) {
      issues.push({
        line: lineIndex + 1,
        message: "URL must be from X, Instagram, TikTok, YouTube, Pinterest, Lemon8, or Threads.",
      });
      return;
    }

    rows.push({
      platform,
      url,
      publishedAt,
    });
  });

  return { rows, issues };
}

export function summarizeBulkContent(rows: BulkContentRowDraft[]) {
  const platformContentCounts = {
    x: 0,
    instagram: 0,
    tiktok: 0,
    youtube: 0,
    pinterest: 0,
    lemon8: 0,
    threads: 0,
  } satisfies PlatformContentCount;

  rows.forEach((row) => {
    platformContentCounts[row.platform] += 1;
  });

  return {
    contentCount: rows.length,
    platformContentCounts,
  };
}

function detectPlatformFromUrl(url: string) {
  let hostname: string;

  try {
    hostname = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }

  return (
    Object.entries(platformHosts).find(([, hosts]) =>
      hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
    )?.[0] ?? null
  ) as Platform | null;
}
