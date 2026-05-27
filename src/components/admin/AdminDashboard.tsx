"use client";

import { useMemo, useState } from "react";
import type { AdminSubmissionListItem, PayoutWorkbookRow } from "@/lib/admin/adminTypes";

type CreatorSummary = {
  id: string;
  creatorName: string;
  creatorHandle: string;
  submissionCount: number;
  totalPosts: number;
  totalViews: number;
  systemEstimatedAmount: number;
  finalConfirmedAmount: number;
  statuses: string[];
  platforms: string[];
  referrals: string[];
  latestSubmittedAt: string;
  submissions: AdminSubmissionListItem[];
};

export function AdminDashboard({
  submissions,
  payoutRows,
}: {
  submissions: AdminSubmissionListItem[];
  payoutRows: PayoutWorkbookRow[];
}) {
  const creatorSummaries = useMemo(() => buildCreatorSummaries(submissions), [submissions]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(
    creatorSummaries[0]?.id ?? null,
  );

  const selectedCreator =
    creatorSummaries.find((creator) => creator.id === selectedCreatorId) ??
    creatorSummaries[0] ??
    null;

  return (
    <main className="min-h-screen bg-[#08111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="border-b border-white/10 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Admin Domain
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Creator overview</h1>
              <p className="mt-2 text-sm text-slate-400">
                Review each creator first, then open one record to inspect links and monthly detail.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Creators" value={String(creatorSummaries.length)} />
              <SummaryStat label="Submissions" value={String(submissions.length)} />
              <SummaryStat
                label="Views"
                value={formatViews(sumAmounts(submissions.map((item) => item.totalViews)))}
              />
              <SummaryStat
                label="Estimate"
                value={formatMoney(sumAmounts(submissions.map((item) => item.systemEstimatedAmount)))}
              />
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.35fr)]">
          <div className="rounded-lg border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-4 py-4">
              <h2 className="text-lg font-semibold">Creators</h2>
              <p className="mt-1 text-sm text-slate-400">
                Each row is a creator summary across all submissions in the system.
              </p>
            </div>

            {creatorSummaries.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-400">
                No creator submissions yet. Once creators submit from the public form, they will
                appear here automatically.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {creatorSummaries.map((creator) => {
                  const isSelected = creator.id === selectedCreator?.id;

                  return (
                    <button
                      className={`w-full px-4 py-4 text-left transition hover:bg-white/[0.05] ${
                        isSelected ? "bg-cyan-300/10" : ""
                      }`}
                      key={creator.id}
                      onClick={() => setSelectedCreatorId(creator.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{creator.creatorName}</p>
                          <p className="truncate text-sm text-slate-400">{creator.creatorHandle}</p>
                        </div>
                        <span className={statusClass(creator.statuses[0] ?? "submitted")}>
                          {humanizeStatus(creator.statuses[0] ?? "submitted")}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <InlineMetric label="Months" value={String(creator.submissionCount)} />
                        <InlineMetric label="Posts" value={String(creator.totalPosts)} />
                        <InlineMetric label="Views" value={formatViews(creator.totalViews)} />
                        <InlineMetric
                          label="Estimate"
                          value={formatMoney(creator.systemEstimatedAmount)}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {creator.platforms.map((platform) => (
                          <span
                            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"
                            key={`${creator.id}-${platform}`}
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111827] p-5">
            {selectedCreator ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedCreator.creatorName}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedCreator.creatorHandle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DetailMetric label="Submissions" value={String(selectedCreator.submissionCount)} />
                    <DetailMetric label="Posts" value={String(selectedCreator.totalPosts)} />
                    <DetailMetric label="Views" value={formatViews(selectedCreator.totalViews)} />
                    <DetailMetric
                      label="Final amount"
                      value={
                        selectedCreator.finalConfirmedAmount > 0
                          ? formatMoney(selectedCreator.finalConfirmedAmount)
                          : "-"
                      }
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    {selectedCreator.submissions.map((submission) => (
                      <article
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
                        key={submission.id}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-white">
                                {submission.monthLabel}
                              </h3>
                              <span className={statusClass(submission.status)}>
                                {humanizeStatus(submission.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-400">
                              Submitted {formatDateTime(submission.submittedAt)}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[240px]">
                            <InlineMetric label="Posts" value={String(submission.posts)} />
                            <InlineMetric label="Views" value={formatViews(submission.totalViews)} />
                            <InlineMetric
                              label="Estimate"
                              value={formatMoney(submission.systemEstimatedAmount)}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {submission.platforms.map((platform) => (
                            <span
                              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"
                              key={`${submission.id}-${platform}`}
                            >
                              {platform}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 space-y-2">
                          {submission.contentItems.map((item, index) => (
                            <div
                              className="rounded-lg border border-white/10 bg-[#0b1020] p-3"
                              key={item.id}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white">
                                    {index + 1}. {item.platform}
                                  </p>
                                  <a
                                    className="mt-1 block break-all text-sm text-cyan-200 hover:text-cyan-100 hover:underline"
                                    href={item.url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {item.url}
                                  </a>
                                  <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                                    <span>
                                      Verified:{" "}
                                      <strong className="text-slate-200">
                                        {item.autoVerifiedViews === null
                                          ? "-"
                                          : formatViews(item.autoVerifiedViews)}
                                      </strong>
                                    </span>
                                    <span>
                                      Admin final:{" "}
                                      <strong className="text-slate-200">
                                        {item.adminVerifiedViews === null
                                          ? "-"
                                          : formatViews(item.adminVerifiedViews)}
                                      </strong>
                                    </span>
                                    <span>
                                      Source:{" "}
                                      <strong className="text-slate-200">
                                        {item.verificationSource
                                          ? humanizeStatus(item.verificationSource)
                                          : "Pending"}
                                      </strong>
                                    </span>
                                  </div>
                                  {item.verificationError ? (
                                    <p className="mt-2 text-xs text-amber-200">
                                      {item.verificationError}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className={verificationStatusClass(item.verificationStatus)}>
                                    {humanizeStatus(item.verificationStatus)}
                                  </span>
                                  <span className={contentStatusClass(item.status)}>
                                    {humanizeStatus(item.status)}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatDate(item.publishedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Platform totals</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCreator.platforms.map((platform) => (
                          <span
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                            key={`platform-total-${platform}`}
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Referrals</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {selectedCreator.referrals.length > 0
                          ? selectedCreator.referrals.join(", ")
                          : "No referrals submitted."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Platform proofs</p>
                      <div className="mt-3 space-y-2">
                        {selectedCreator.submissions.flatMap((submission) => submission.platformProofs)
                          .length > 0 ? (
                          selectedCreator.submissions.flatMap((submission) =>
                            submission.platformProofs.map((proof) => (
                              <a
                                className="block rounded-lg border border-white/10 px-3 py-2 text-sm text-cyan-200 hover:bg-white/[0.04] hover:text-cyan-100"
                                href={proof.url}
                                key={proof.id}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {proof.platform}: {proof.filename}
                              </a>
                            )),
                          )
                        ) : (
                          <p className="text-sm text-slate-400">No proof screenshots uploaded.</p>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No creator selected yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Payout worksheet</h2>
              <p className="mt-1 text-sm text-slate-400">
                Same column structure as the finance workbook you shared.
              </p>
            </div>
            <a
              className="inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              href="/api/admin/payout-workbook"
            >
              Download Excel
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#0b1020] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "ID",
                    "Total Views",
                    "Corresponding Reward",
                    "Referral",
                    "Corresponding Reward",
                    "Post Count",
                    "Corresponding Reward",
                    "View Ranking",
                    "Corresponding Reward",
                    "Newbie bonus",
                    "应付金额 (美元)",
                    "PayPal",
                    "Name",
                  ].map((heading, index) => (
                    <th className="px-4 py-3 font-semibold" key={`${heading}-${index}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoutRows.map((row) => (
                  <tr className="border-t border-white/10" key={`${row.rewardMonth}-${row.creatorId}`}>
                    <td className="px-4 py-3 text-white">{row.creatorId}</td>
                    <td className="px-4 py-3 text-white">{row.totalViews}</td>
                    <td className="px-4 py-3 text-cyan-200">{formatMoney(row.totalViewsReward)}</td>
                    <td className="px-4 py-3 text-white">{row.referralCount}</td>
                    <td className="px-4 py-3 text-cyan-200">{formatMoney(row.referralReward)}</td>
                    <td className="px-4 py-3 text-white">{row.postCount}</td>
                    <td className="px-4 py-3 text-cyan-200">{formatMoney(row.postCountReward)}</td>
                    <td className="px-4 py-3 text-white">{row.viewRanking ?? "-"}</td>
                    <td className="px-4 py-3 text-cyan-200">{formatMoney(row.viewRankingReward)}</td>
                    <td className="px-4 py-3 text-cyan-200">{formatMoney(row.newbieBonus)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-200">
                      {formatMoney(row.payableAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.paypal}</td>
                    <td className="px-4 py-3 text-slate-300">{row.creatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function buildCreatorSummaries(submissions: AdminSubmissionListItem[]): CreatorSummary[] {
  const groups = new Map<string, CreatorSummary>();

  for (const submission of submissions) {
    const existing = groups.get(submission.creatorHandle);

    if (!existing) {
      groups.set(submission.creatorHandle, {
        id: submission.creatorHandle,
        creatorName: submission.creatorName,
        creatorHandle: submission.creatorHandle,
        submissionCount: 1,
        totalPosts: submission.posts,
        totalViews: submission.totalViews,
        systemEstimatedAmount: submission.systemEstimatedAmount,
        finalConfirmedAmount: submission.finalConfirmedAmount ?? 0,
        statuses: [submission.status],
        platforms: [...submission.platforms],
        referrals: submission.referrals.map((referral) => referral.discordUsername),
        latestSubmittedAt: submission.submittedAt,
        submissions: [submission],
      });
      continue;
    }

    existing.submissionCount += 1;
    existing.totalPosts += submission.posts;
    existing.totalViews += submission.totalViews;
    existing.systemEstimatedAmount += submission.systemEstimatedAmount;
    existing.finalConfirmedAmount += submission.finalConfirmedAmount ?? 0;
    existing.statuses = uniqueValues([submission.status, ...existing.statuses]);
    existing.platforms = uniqueValues([...existing.platforms, ...submission.platforms]);
    existing.referrals = uniqueValues([
      ...existing.referrals,
      ...submission.referrals.map((referral) => referral.discordUsername),
    ]);
    existing.submissions.push(submission);

    if (new Date(submission.submittedAt) > new Date(existing.latestSubmittedAt)) {
      existing.latestSubmittedAt = submission.submittedAt;
    }
  }

  return [...groups.values()]
    .map((creator) => ({
      ...creator,
      submissions: [...creator.submissions].sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
      ),
    }))
    .sort(
      (left, right) =>
        new Date(right.latestSubmittedAt).getTime() - new Date(left.latestSubmittedAt).getTime(),
    );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1020] p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "under_review") {
    return "rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200";
  }

  if (status === "approved" || status === "paid") {
    return "rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200";
  }

  if (status === "rejected") {
    return "rounded-full bg-red-300/15 px-3 py-1 text-xs font-semibold text-red-100";
  }

  return "rounded-full bg-violet-300/15 px-3 py-1 text-xs font-semibold text-violet-200";
}

function contentStatusClass(status: string) {
  if (status === "valid") {
    return "rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-semibold text-emerald-200";
  }

  if (status === "invalid") {
    return "rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-200";
  }

  return "rounded-full bg-slate-300/10 px-2.5 py-1 text-xs font-semibold text-slate-300";
}

function verificationStatusClass(status: string) {
  if (status === "verified") {
    return "rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-semibold text-emerald-200";
  }

  if (status === "unavailable") {
    return "rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-200";
  }

  if (status === "failed") {
    return "rounded-full bg-red-300/15 px-2.5 py-1 text-xs font-semibold text-red-100";
  }

  return "rounded-full bg-slate-300/10 px-2.5 py-1 text-xs font-semibold text-slate-300";
}

function humanizeStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatViews(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function sumAmounts(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}
