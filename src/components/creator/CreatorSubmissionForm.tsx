"use client";

import { FormEvent, useMemo, useState } from "react";
import { supportedPlatforms, type Platform } from "@/lib/rewards/rewardTypes";
import { parseBulkContentInput, summarizeBulkContent } from "@/lib/submissions/parseBulkContent";
import type { SubmissionValidationIssue } from "@/lib/submissions/submissionTypes";
import type { CreatorSubmissionDraft } from "@/lib/submissions/submissionTypes";
import { validateCreatorSubmission } from "@/lib/submissions/validateSubmission";

type SubmittedPreview = {
  submittedAt: string;
  referralCount: number;
  contentCount: number;
};

type CreatorSubmissionHistoryItem = {
  id: string;
  campaignName: string;
  rewardMonthKey: string;
  status: string;
  submittedAt: string;
  totalViews: number;
  contentCount: number;
  platforms: string[];
  proofCount: number;
  contentItems: Array<{
    id: string;
    platform: string;
    url: string;
    publishedAt: string;
  }>;
};

export function CreatorSubmissionForm({
  campaign,
  creator,
  submissionHistory,
}: {
  campaign: {
    id: string;
    name: string;
    rewardMonth: string;
  };
  creator: {
    discordUserId: string;
    discordUsername: string;
  };
  submissionHistory: CreatorSubmissionHistoryItem[];
}) {
  const [creatorFullName, setCreatorFullName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [totalMonthlyViews, setTotalMonthlyViews] = useState("");
  const [referralText, setReferralText] = useState("");
  const [platformProofFiles, setPlatformProofFiles] = useState<
    Partial<Record<Platform, File[]>>
  >({});
  const [issues, setIssues] = useState<SubmissionValidationIssue[]>([]);
  const [bulkParseMessages, setBulkParseMessages] = useState<string[]>([]);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const referralDiscordUsernames = useMemo(
    () =>
      referralText
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    [referralText],
  );

  const issueSummary = useMemo(() => summarizeIssues(issues), [issues]);
  const parsedPreview = useMemo(
    () => parseBulkContentInput(bulkInput, campaign.rewardMonth),
    [bulkInput, campaign.rewardMonth],
  );
  const requiredPlatforms = useMemo(
    () =>
      supportedPlatforms.filter(
        (platform) => summarizeBulkContent(parsedPreview.rows).platformContentCounts[platform] > 0,
      ),
    [parsedPreview.rows],
  );

  async function submitCreatorContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsedPreview;

    setBulkParseMessages(parsed.issues.map((issue) => `Line ${issue.line}: ${issue.message}`));

    if (parsed.rows.length === 0 || parsed.issues.length > 0) {
      setSubmittedPreview(null);
      return;
    }

    const totalViews = Number(totalMonthlyViews);
    const draft: CreatorSubmissionDraft = {
      creatorDiscordId: creator.discordUserId,
      creatorFullName,
      paypalEmail,
      campaignId: campaign.id,
      campaignName: campaign.name,
      rewardMonth: campaign.rewardMonth,
      status: "submitted",
      referralDiscordUsernames,
      platformProofs: requiredPlatforms.flatMap((platform) =>
        (platformProofFiles[platform] ?? []).map((file) => ({
          platform,
          blobUrl: file.name,
          filename: file.name,
        })),
      ),
      contentItems: parsed.rows.map((row) => ({
        id: `content-${crypto.randomUUID()}`,
        platform: row.platform,
        url: row.url,
        publishedAt: row.publishedAt,
        monthlyViews: 0,
        status: "pending",
      })),
    };

    const validation = validateCreatorSubmission(draft, []);
    const submissionIssues = [...validation.issues];

    if (!Number.isInteger(totalViews) || totalViews < 0) {
      submissionIssues.push({
        field: "totalMonthlyViews",
        message: "Monthly total views must be zero or greater.",
      });
    }

    if (submissionIssues.length > 0) {
      setIssues(submissionIssues);
      setSubmittedPreview(null);
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.set("creatorFullName", draft.creatorFullName);
      formData.set("paypalEmail", draft.paypalEmail);
      formData.set("campaignId", campaign.id);
      formData.set("bulkInput", bulkInput);
      formData.set("totalMonthlyViews", String(totalViews));
      formData.set("referralDiscordUsernames", JSON.stringify(referralDiscordUsernames));

      requiredPlatforms.forEach((platform) => {
        (platformProofFiles[platform] ?? []).forEach((file) => {
          formData.append(`platformProof.${platform}`, file);
        });
      });

      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        setIssues(payload.issues ?? []);
        setSubmittedPreview(null);
        return;
      }

      setIssues([]);
      setSubmittedPreview({
        submittedAt: new Date(payload.submittedAt ?? Date.now()).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        referralCount: Number(payload.referralCount ?? referralDiscordUsernames.length),
        contentCount: Number(payload.contentCount ?? 0),
      });
      setBulkInput("");
      setTotalMonthlyViews("");
      setReferralText("");
      setPlatformProofFiles({});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
        <p className="text-sm font-semibold text-cyan-100">Signed in with Discord</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
          <div>
            <span className="text-slate-400">Discord username</span>
            <p className="mt-1 font-medium text-white">@{creator.discordUsername}</p>
          </div>
          <div>
            <span className="text-slate-400">Discord ID</span>
            <p className="mt-1 font-medium text-white">{creator.discordUserId}</p>
          </div>
        </div>
      </div>

      <form className="space-y-6" onSubmit={submitCreatorContent}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldShell label="Full name">
            <input
              className="creator-input"
              onChange={(event) => setCreatorFullName(event.target.value)}
              placeholder="Your full legal name"
              value={creatorFullName}
            />
          </FieldShell>

          <FieldShell label="PayPal account">
            <input
              className="creator-input"
              onChange={(event) => setPaypalEmail(event.target.value)}
              placeholder="paypal@example.com"
              type="email"
              value={paypalEmail}
            />
          </FieldShell>

          <FieldShell label="Campaign name">
            <input className="creator-input" readOnly value={campaign.name} />
          </FieldShell>

          <FieldShell label="Campaign reward month">
            <input className="creator-input" readOnly value={formatRewardMonth(campaign.rewardMonth)} />
          </FieldShell>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-white">Bulk paste</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Paste one content URL per line. The system will classify the platform automatically.
            You can optionally add a published date after the URL using a comma.
          </p>

          <textarea
            className="creator-input mt-4 min-h-36 resize-y font-mono text-sm"
            onChange={(event) => setBulkInput(event.target.value)}
            placeholder={[
              "https://www.tiktok.com/@vmake/video/1",
              "https://www.instagram.com/reel/abc",
              "https://youtu.be/xyz, 2026-05-09",
            ].join("\n")}
            value={bulkInput}
          />

          {bulkParseMessages.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="text-sm font-semibold text-amber-100">Bulk paste needs attention</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-50">
                {bulkParseMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {requiredPlatforms.length > 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Platform analytics screenshots</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Upload one or more screenshots for each platform used in this campaign. These files
              are only visible to the admin team.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {requiredPlatforms.map((platform) => (
                <FieldShell key={platform} label={`${platformName(platform)} screenshots`}>
                  <div className="space-y-2">
                    <input
                      accept="image/*"
                      className="creator-input file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-200"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);

                        setPlatformProofFiles((current) => {
                          const next = { ...current };

                          if (files.length > 0) {
                            next[platform] = files;
                          } else {
                            delete next[platform];
                          }

                          return next;
                        });
                      }}
                      type="file"
                    />
                    <p className="text-xs text-slate-500">
                      {platformProofFiles[platform]?.length
                        ? `${platformProofFiles[platform]?.length} screenshot(s) selected`
                        : `Required for ${platformName(platform)} content.`}
                    </p>
                  </div>
                </FieldShell>
              ))}
            </div>
          </section>
        ) : null}

        <FieldShell label="Monthly total views">
          <input
            className="creator-input"
            inputMode="numeric"
            min="0"
            onChange={(event) => setTotalMonthlyViews(event.target.value)}
            placeholder="Example: 128400"
            type="number"
            value={totalMonthlyViews}
          />
        </FieldShell>

        <FieldShell label="Referral creator Discord usernames">
          <textarea
            className="creator-input min-h-24 resize-y"
            onChange={(event) => setReferralText(event.target.value)}
            placeholder="creator.one, creator_two#1234"
            value={referralText}
          />
        </FieldShell>

        {issues.length > 0 ? (
          <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4">
            <p className="text-sm font-semibold text-red-100">Submission needs fixes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {issueSummary.map(([message, count]) => (
                <span
                  className="rounded-full border border-red-200/20 bg-red-950/30 px-3 py-1 text-xs text-red-50"
                  key={message}
                >
                  {count} x {message}
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-red-100">
              {issues.map((issue, index) => (
                <li key={`${issue.field}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {submittedPreview ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
            <p className="text-sm font-semibold text-emerald-100">Submission received</p>
            <p className="mt-2 text-sm text-slate-300">
              Your {submittedPreview.contentCount} content link
              {submittedPreview.contentCount === 1 ? "" : "s"} were submitted at{" "}
              {submittedPreview.submittedAt}. {submittedPreview.referralCount} referral
              {submittedPreview.referralCount === 1 ? "" : "s"} went with the same submission.
            </p>
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Submitting..." : "Submit for review"}
        </button>
      </form>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Your submission history</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Every campaign you submitted while signed in with this Discord account.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
            {submissionHistory.length} record{submissionHistory.length === 1 ? "" : "s"}
          </span>
        </div>

        {submissionHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No past submissions yet. Once you submit a campaign, it will appear here automatically.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {submissionHistory.map((submission) => (
              <article
                className="rounded-xl border border-white/10 bg-[#0b1020] p-4"
                key={submission.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{submission.campaignName}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted {formatSubmittedAt(submission.submittedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {humanizeStatus(submission.status)}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                  <HistoryMetric label="Views" value={formatNumber(submission.totalViews)} />
                  <HistoryMetric label="Links" value={String(submission.contentCount)} />
                  <HistoryMetric label="Platforms" value={String(submission.platforms.length)} />
                  <HistoryMetric label="Proofs" value={String(submission.proofCount)} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {submission.platforms.map((platform) => (
                    <span
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"
                      key={`${submission.id}-${platform}`}
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function summarizeIssues(issues: SubmissionValidationIssue[]) {
  const counts = new Map<string, number>();

  issues.forEach((issue) => {
    counts.set(issue.message, (counts.get(issue.message) ?? 0) + 1);
  });

  return Array.from(counts.entries());
}

function FieldShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function platformName(platform: Platform) {
  if (platform === "x") {
    return "X";
  }

  if (platform === "tiktok") {
    return "TikTok";
  }

  if (platform === "lemon8") {
    return "Lemon8";
  }

  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function formatRewardMonth(rewardMonth: string) {
  const [year, month] = rewardMonth.split("-");

  if (!year || !month) {
    return rewardMonth;
  }

  return new Date(`${rewardMonth}-01T00:00:00.000Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatSubmittedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function humanizeStatus(value: string) {
  return value.replace(/_/g, " ");
}
