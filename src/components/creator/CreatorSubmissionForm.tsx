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

const currentRewardMonth = "2026-05";
export function CreatorSubmissionForm() {
  const [creatorId, setCreatorId] = useState("creator-demo");
  const [bulkInput, setBulkInput] = useState("");
  const [totalMonthlyViews, setTotalMonthlyViews] = useState("");
  const [referralText, setReferralText] = useState("");
  const [platformProofFiles, setPlatformProofFiles] = useState<Partial<Record<Platform, File>>>({});
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
    () => parseBulkContentInput(bulkInput, currentRewardMonth),
    [bulkInput],
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
      creatorId,
      rewardMonth: currentRewardMonth,
      status: "submitted",
      referralDiscordUsernames,
      platformProofs: requiredPlatforms
        .map((platform) => {
          const file = platformProofFiles[platform];

          if (!file) {
            return null;
          }

          return {
            platform,
            blobUrl: file.name,
            filename: file.name,
          };
        })
        .filter(Boolean) as CreatorSubmissionDraft["platformProofs"],
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
      formData.set("creatorId", draft.creatorId);
      formData.set("rewardMonth", currentRewardMonth);
      formData.set("bulkInput", bulkInput);
      formData.set("totalMonthlyViews", String(totalViews));
      formData.set("referralDiscordUsernames", JSON.stringify(referralDiscordUsernames));

      requiredPlatforms.forEach((platform) => {
        const file = platformProofFiles[platform];

        if (file) {
          formData.set(`platformProof.${platform}`, file);
        }
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submitCreatorContent}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldShell label="Creator ID">
          <input
            className="creator-input"
            onChange={(event) => setCreatorId(event.target.value)}
            value={creatorId}
          />
        </FieldShell>

        <FieldShell label="Reward month">
          <input className="creator-input" readOnly value="May 2026" />
        </FieldShell>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div>
          <div>
            <p className="text-sm font-semibold text-white">Bulk paste</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Paste one content URL per line. The system will classify the platform automatically.
              You can optionally add a published date after the URL using a comma.
            </p>
          </div>
        </div>

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
            Upload one screenshot per platform used this month. These screenshots are required and
            only visible to the admin team.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {requiredPlatforms.map((platform) => (
              <FieldShell key={platform} label={`${platformName(platform)} screenshot`}>
                <div className="space-y-2">
                  <input
                    accept="image/*"
                    className="creator-input file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-200"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      setPlatformProofFiles((current) => {
                        const next = { ...current };

                        if (file) {
                          next[platform] = file;
                        } else {
                          delete next[platform];
                        }

                        return next;
                      });
                    }}
                    type="file"
                  />
                  <p className="text-xs text-slate-500">
                    {platformProofFiles[platform]
                      ? `Selected: ${platformProofFiles[platform]?.name}`
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

      <FieldShell label="Referral Discord usernames">
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
            {submittedPreview.contentCount === 1 ? "" : "s"} and monthly views were submitted at{" "}
            {submittedPreview.submittedAt}.{" "}
            {submittedPreview.referralCount} referral
            {submittedPreview.referralCount === 1 ? "" : "s"} submitted at{" "}
            the same time. Your final reward will be confirmed after admin review.
          </p>
        </div>
      ) : null}

      <button
        className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Submit for review"}
      </button>
    </form>
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
