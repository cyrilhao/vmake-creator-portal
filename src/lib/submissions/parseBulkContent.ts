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
    const cells = parseLineCells(line, defaultPublishedAt);

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

function parseLineCells(line: string, defaultPublishedAt: string) {
  if (line.includes("\t")) {
    return line
      .split("\t")
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  const commaIndex = line.lastIndexOf(",");

  if (commaIndex === -1) {
    return [line.trim(), defaultPublishedAt];
  }

  const possibleUrl = line.slice(0, commaIndex).trim();
  const possibleDate = line.slice(commaIndex + 1).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(possibleDate)) {
    return [possibleUrl, possibleDate];
  }

  return [line.trim(), defaultPublishedAt];
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
