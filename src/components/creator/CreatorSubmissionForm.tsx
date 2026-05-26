"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateSubmissionReward } from "@/lib/rewards/calculateReward";
import type { Platform } from "@/lib/rewards/rewardTypes";
import { supportedPlatforms } from "@/lib/rewards/rewardTypes";
import { vmakeCreatorProgramRulesV1 } from "@/lib/rewards/vmakeRules";
import { parseBulkContentInput } from "@/lib/submissions/parseBulkContent";
import type { SubmissionValidationIssue } from "@/lib/submissions/submissionTypes";
import type { CreatorSubmissionDraft } from "@/lib/submissions/submissionTypes";
import { validateCreatorSubmission } from "@/lib/submissions/validateSubmission";

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
const defaultPublishedDate = "2026-05-01";
const maxPublishedDate = "2026-05-31";

function createRowId() {
  return `content-${crypto.randomUUID()}`;
}

function defaultContentRow(): ContentFormRow {
  return {
    id: createRowId(),
    platform: "tiktok",
    url: "",
    publishedAt: defaultPublishedDate,
    monthlyViews: "",
  };
}

export function CreatorSubmissionForm() {
  const [creatorId, setCreatorId] = useState("creator-demo");
  const [bulkInput, setBulkInput] = useState("");
  const [contentRows, setContentRows] = useState<ContentFormRow[]>([defaultContentRow()]);
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
  const rowIssueMap = useMemo(() => mapRowIssues(issues), [issues]);

  function updateContentRow(id: string, updates: Partial<ContentFormRow>) {
    setContentRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
  }

  function addContentRow() {
    setContentRows((rows) => [...rows, defaultContentRow()]);
  }

  function removeContentRow(id: string) {
    setContentRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== id)));
  }

  function applyBulkInput() {
    const parsed = parseBulkContentInput(bulkInput, currentRewardMonth);

    setBulkParseMessages(parsed.issues.map((issue) => `Line ${issue.line}: ${issue.message}`));

    if (parsed.rows.length === 0) {
      return;
    }

    setContentRows(
      parsed.rows.map((row) => ({
        id: createRowId(),
        platform: row.platform,
        url: row.url,
        monthlyViews: row.monthlyViews,
        publishedAt: row.publishedAt,
      })),
    );
    setIssues([]);
    setSubmittedPreview(null);
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
      setIssues(validation.issues);
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
          id: contentItem.id ?? createRowId(),
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
      contentCount: contentRows.length,
      referralCount: referralDiscordUsernames.length,
      internalEstimatedAmount: rewardResult.estimatedAmount,
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Bulk paste</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Paste one row per content item using comma or tab separation. Format:
              platform, link, views, optional published date.
            </p>
          </div>
          <button
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={applyBulkInput}
            type="button"
          >
            Load rows
          </button>
        </div>

        <textarea
          className="creator-input mt-4 min-h-36 resize-y font-mono text-sm"
          onChange={(event) => setBulkInput(event.target.value)}
          placeholder={[
            "TikTok, https://www.tiktok.com/@vmake/video/1, 12000, 2026-05-10",
            "Instagram, https://www.instagram.com/reel/abc, 8900, 2026-05-14",
            "YouTube\thttps://youtu.be/xyz\t32000",
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Content table</p>
            <p className="mt-1 text-xs text-slate-400">
              Edit parsed rows before submission. Pasted rows default to the first day of the reward month when no date is provided.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              onClick={addContentRow}
              type="button"
            >
              Add row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b1020]">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Platform</th>
                <th className="px-3 py-3 font-semibold">Content link</th>
                <th className="px-3 py-3 font-semibold">Views</th>
                <th className="px-3 py-3 font-semibold">Published</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {contentRows.map((row, index) => {
                const rowIssues = rowIssueMap.get(index) ?? [];

                return (
                  <tr className="border-t border-white/10 align-top" key={row.id}>
                    <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3">
                      <select
                        className="creator-input min-w-[120px] py-2"
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
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="creator-input py-2"
                        onChange={(event) =>
                          updateContentRow(row.id, { url: event.target.value })
                        }
                        placeholder="https://..."
                        type="url"
                        value={row.url}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="creator-input min-w-[120px] py-2"
                        inputMode="numeric"
                        min="0"
                        onChange={(event) =>
                          updateContentRow(row.id, { monthlyViews: event.target.value })
                        }
                        placeholder="12000"
                        type="number"
                        value={row.monthlyViews}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="creator-input min-w-[150px] py-2"
                        max={maxPublishedDate}
                        min={defaultPublishedDate}
                        onChange={(event) =>
                          updateContentRow(row.id, { publishedAt: event.target.value })
                        }
                        type="date"
                        value={row.publishedAt}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {rowIssues.length === 0 ? (
                        <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                          Ready
                        </span>
                      ) : (
                        <div className="space-y-2">
                          <span className="rounded-full bg-red-300/15 px-2.5 py-1 text-xs font-semibold text-red-100">
                            Needs fixes
                          </span>
                          <ul className="space-y-1 text-xs leading-5 text-red-100">
                            {rowIssues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="text-sm text-slate-400 hover:text-white"
                        onClick={() => removeContentRow(row.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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

function mapRowIssues(issues: SubmissionValidationIssue[]) {
  const rowIssues = new Map<number, string[]>();

  issues.forEach((issue) => {
    const match = issue.field.match(/^contentItems\[(\d+)\]/);

    if (!match) {
      return;
    }

    const rowIndex = Number(match[1]);
    const current = rowIssues.get(rowIndex) ?? [];
    current.push(issue.message);
    rowIssues.set(rowIndex, current);
  });

  return rowIssues;
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
