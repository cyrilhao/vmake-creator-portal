import type { Platform } from "@/lib/rewards/rewardTypes";

export type BulkContentRowDraft = {
  platform: Platform;
  url: string;
  monthlyViews: string;
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

const platformAliases: Record<string, Platform> = {
  x: "x",
  twitter: "x",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  yt: "youtube",
  pinterest: "pinterest",
  pin: "pinterest",
  lemon8: "lemon8",
  threads: "threads",
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
    const cells =
      delimiter === "," && rawCells.length > 4
        ? [rawCells[0], rawCells[1], rawCells.slice(2, -1).join(""), rawCells.at(-1) ?? ""]
        : rawCells;

    if (cells.length < 3) {
      issues.push({
        line: lineIndex + 1,
        message: "Use platform, link, views, and optional published date.",
      });
      return;
    }

    const [platformInput, url, viewsInput, publishedAt = defaultPublishedAt] = cells;
    const platform = parsePlatform(platformInput);

    if (!platform) {
      issues.push({
        line: lineIndex + 1,
        message: `Unsupported platform "${platformInput}".`,
      });
      return;
    }

    rows.push({
      platform,
      url,
      monthlyViews: normalizeViews(viewsInput),
      publishedAt,
    });
  });

  return { rows, issues };
}

function parsePlatform(value: string) {
  return platformAliases[value.trim().toLowerCase()] ?? null;
}

function normalizeViews(value: string) {
  return value.replace(/,/g, "").trim();
}
