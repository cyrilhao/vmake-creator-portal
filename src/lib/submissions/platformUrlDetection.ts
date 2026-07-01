import type { Platform } from "@/lib/rewards/rewardTypes";

const platformDomainKeywords: Record<Platform, string[]> = {
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com", "instagr.am"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  pinterest: ["pinterest.com", "pin.it"],
  lemon8: ["lemon8.com", "lemon8-app.com"],
  threads: ["threads.net"],
};

export function detectPlatformFromUrl(url: string) {
  const hostname = extractHostname(url);

  if (!hostname) {
    return null;
  }

  return (
    Object.entries(platformDomainKeywords).find(([, keywords]) =>
      keywords.some((keyword) => matchesHostnameKeyword(hostname, keyword)),
    )?.[0] ?? null
  ) as Platform | null;
}

export function urlMatchesPlatform(platform: Platform, url: string) {
  const hostname = extractHostname(url);

  if (!hostname) {
    return false;
  }

  return platformDomainKeywords[platform].some((keyword) =>
    matchesHostnameKeyword(hostname, keyword),
  );
}

function extractHostname(rawUrl: string) {
  const normalizedUrl = normalizeUrlForParsing(rawUrl);

  if (!normalizedUrl) {
    return null;
  }

  try {
    return new URL(normalizedUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeUrlForParsing(rawUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

function matchesHostnameKeyword(hostname: string, keyword: string) {
  return hostname === keyword || hostname.endsWith(`.${keyword}`);
}
