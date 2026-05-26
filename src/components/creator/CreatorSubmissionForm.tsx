"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateSubmissionReward } from "@/lib/rewards/calculateReward";
import { vmakeCreatorProgramRulesV1 } from "@/lib/rewards/vmakeRules";
import { parseBulkContentInput } from "@/lib/submissions/parseBulkContent";
import { summarizeBulkContent } from "@/lib/submissions/parseBulkContent";
import type { SubmissionValidationIssue } from "@/lib/submissions/submissionTypes";
import type { CreatorSubmissionDraft } from "@/lib/submissions/submissionTypes";
import { validateCreatorSubmission } from "@/lib/submissions/validateSubmission";

type SubmittedPreview = {
  submittedAt: string;
  referralCount: number;
  internalEstimatedAmount: number;
  internalContentCount: number;
  internalPlatformCounts: Record<string, number>;
};

const currentRewardMonth = "2026-05";
export function CreatorSubmissionForm() {
  const [creatorId, setCreatorId] = useState("creator-demo");
  const [bulkInput, setBulkInput] = useState("");
  const [totalMonthlyViews, setTotalMonthlyViews] = useState("");
  const [referralText, setReferralText] = useState("");
  const [issues, setIssues] = useState<SubmissionValidationIssue[]>([]);
  const [bulkParseMessages, setBulkParseMessages] = useState<string[]>([]);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedPreview | null>(null);

  const referralDiscordUsernames = useMemo(
    () =>
      referralText
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    [referralText],
  );

  const issueSummary = useMemo(() => summarizeIssues(issues), [issues]);

  function submitCreatorContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseBulkContentInput(bulkInput, currentRewardMonth);

    setBulkParseMessages(parsed.issues.map((issue) => `Line ${issue.line}: ${issue.message}`));

    if (parsed.rows.length === 0 || parsed.issues.length > 0) {
      setSubmittedPreview(null);
      return;
    }

    const totalViews = Number(totalMonthlyViews);
    const summary = summarizeBulkContent(parsed.rows);

    const draft: CreatorSubmissionDraft = {
      creatorId,
      rewardMonth: currentRewardMonth,
      status: "submitted",
      referralDiscordUsernames,
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

    const rewardResult = calculateSubmissionReward(
      {
        creatorId: draft.creatorId,
        submissionId: `local-${Date.now()}`,
        status: "submitted",
        hasPreviousValidPost: false,
        totalViewsOverride: totalViews,
        contentItems: draft.contentItems.map((contentItem) => ({
          id: contentItem.id ?? `content-${crypto.randomUUID()}`,
          platform: contentItem.platform,
          url: contentItem.url,
          monthlyViews: contentItem.monthlyViews,
          status: "valid",
        })),
        referrals: referralDiscordUsernames.map((username) => ({
          id: username,
          discordUsername: username,
          status: "pending",
        })),
      },
      vmakeCreatorProgramRulesV1,
    );

    setIssues([]);
    setSubmittedPreview({
      submittedAt: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      referralCount: referralDiscordUsernames.length,
      internalEstimatedAmount: rewardResult.estimatedAmount,
      internalContentCount: summary.contentCount,
      internalPlatformCounts: summary.platformContentCounts,
    });
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
            Your content links and monthly views were submitted at {submittedPreview.submittedAt}.
            {" "}
            {submittedPreview.referralCount} referral
            {submittedPreview.referralCount === 1 ? "" : "s"} submitted at{" "}
            the same time. Your final reward will be confirmed after admin review.
          </p>
        </div>
      ) : null}

      <button
        className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        type="submit"
      >
        Submit for review
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
