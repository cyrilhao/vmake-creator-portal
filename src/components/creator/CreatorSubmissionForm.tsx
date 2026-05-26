"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateSubmissionReward } from "@/lib/rewards/calculateReward";
import type { Platform } from "@/lib/rewards/rewardTypes";
import { supportedPlatforms } from "@/lib/rewards/rewardTypes";
import { vmakeCreatorProgramRulesV1 } from "@/lib/rewards/vmakeRules";
import { validateCreatorSubmission } from "@/lib/submissions/validateSubmission";
import type { CreatorSubmissionDraft } from "@/lib/submissions/submissionTypes";

type ContentFormRow = {
  id: string;
  platform: Platform;
  url: string;
  publishedAt: string;
  monthlyViews: string;
};

type SubmittedPreview = {
  submittedAt: string;
  contentCount: number;
  referralCount: number;
  internalEstimatedAmount: number;
};

const platformLabels: Record<Platform, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  lemon8: "Lemon8",
  threads: "Threads",
};

const currentRewardMonth = "2026-05";

const defaultContentRow = (id = "content-1"): ContentFormRow => ({
  id,
  platform: "tiktok",
  url: "",
  publishedAt: "2026-05-01",
  monthlyViews: "",
});

export function CreatorSubmissionForm() {
  const [creatorId, setCreatorId] = useState("creator-demo");
  const [contentRows, setContentRows] = useState<ContentFormRow[]>([
    defaultContentRow("content-1"),
  ]);
  const [referralText, setReferralText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedPreview | null>(
    null,
  );

  const referralDiscordUsernames = useMemo(
    () =>
      referralText
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    [referralText],
  );

  function updateContentRow(id: string, updates: Partial<ContentFormRow>) {
    setContentRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
  }

  function addContentRow() {
    setContentRows((rows) => [...rows, defaultContentRow(`content-${rows.length + 1}`)]);
  }

  function removeContentRow(id: string) {
    setContentRows((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== id),
    );
  }

  function submitCreatorContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const draft: CreatorSubmissionDraft = {
      creatorId,
      rewardMonth: currentRewardMonth,
      status: "submitted",
      referralDiscordUsernames,
      contentItems: contentRows.map((row) => ({
        id: row.id,
        platform: row.platform,
        url: row.url,
        publishedAt: row.publishedAt,
        monthlyViews: Number(row.monthlyViews),
        status: "pending",
      })),
    };

    const validation = validateCreatorSubmission(draft, []);

    if (!validation.valid) {
      setIssues(validation.issues.map((issue) => issue.message));
      setSubmittedPreview(null);
      return;
    }

    const rewardResult = calculateSubmissionReward(
      {
        creatorId: draft.creatorId,
        submissionId: `local-${Date.now()}`,
        status: "submitted",
        hasPreviousValidPost: false,
        contentItems: draft.contentItems.map((contentItem) => ({
          id: contentItem.id ?? crypto.randomUUID(),
          platform: contentItem.platform,
          url: contentItem.url,
          monthlyViews: contentItem.monthlyViews,
          // Creator submissions are estimated internally before admin validation.
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
      contentCount: contentRows.length,
      referralCount: referralDiscordUsernames.length,
      internalEstimatedAmount: rewardResult.estimatedAmount,
    });
  }

  return (
    <form className="space-y-5" onSubmit={submitCreatorContent}>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Published content</p>
            <p className="text-xs text-slate-400">
              Add links published in the current reward month.
            </p>
          </div>
          <button
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            type="button"
            onClick={addContentRow}
          >
            Add link
          </button>
        </div>

        {contentRows.map((row, index) => (
          <div
            className="rounded-lg border border-white/10 bg-[#0b1020] p-4"
            key={row.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-200">
                Content {index + 1}
              </p>
              <button
                className="text-sm text-slate-400 hover:text-white"
                type="button"
                onClick={() => removeContentRow(row.id)}
              >
                Remove
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FieldShell label="Platform">
                <select
                  className="creator-input"
                  onChange={(event) =>
                    updateContentRow(row.id, {
                      platform: event.target.value as Platform,
                    })
                  }
                  value={row.platform}
                >
                  {supportedPlatforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platformLabels[platform]}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Published date">
                <input
                  className="creator-input"
                  max="2026-05-31"
                  min="2026-05-01"
                  onChange={(event) =>
                    updateContentRow(row.id, { publishedAt: event.target.value })
                  }
                  type="date"
                  value={row.publishedAt}
                />
              </FieldShell>
            </div>

            <div className="mt-3">
              <FieldShell label="Content link">
                <input
                  className="creator-input"
                  onChange={(event) =>
                    updateContentRow(row.id, { url: event.target.value })
                  }
                  placeholder="https://..."
                  type="url"
                  value={row.url}
                />
              </FieldShell>
            </div>

            <div className="mt-3">
              <FieldShell label="Monthly views">
                <input
                  className="creator-input"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    updateContentRow(row.id, { monthlyViews: event.target.value })
                  }
                  placeholder="Example: 12000"
                  type="number"
                  value={row.monthlyViews}
                />
              </FieldShell>
            </div>
          </div>
        ))}
      </div>

      <FieldShell label="Referral Discord usernames">
        <textarea
          className="creator-input min-h-24 resize-y"
          onChange={(event) => setReferralText(event.target.value)}
          placeholder="creator.one, creator_two#1234"
          value={referralText}
        />
      </FieldShell>

      {issues.length > 0 ? (
        <div className="rounded-lg border border-red-300/30 bg-red-300/10 p-4">
          <p className="text-sm font-semibold text-red-100">Please fix these items</p>
          <ul className="mt-2 space-y-1 text-sm text-red-100">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {submittedPreview ? (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4">
          <p className="text-sm font-semibold text-emerald-100">
            Submission received
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {submittedPreview.contentCount} content link
            {submittedPreview.contentCount === 1 ? "" : "s"} and{" "}
            {submittedPreview.referralCount} referral
            {submittedPreview.referralCount === 1 ? "" : "s"} submitted at{" "}
            {submittedPreview.submittedAt}. Your final reward will be confirmed
            after admin review.
          </p>
        </div>
      ) : null}

      <button
        className="w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        type="submit"
      >
        Submit for review
      </button>
    </form>
  );
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
