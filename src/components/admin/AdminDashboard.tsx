type AdminSubmissionListItem = {
  id: string;
  creatorName: string;
  creatorHandle: string;
  monthLabel: string;
  status: string;
  posts: number;
  totalViews: number;
  platforms: string[];
  systemEstimatedAmount: number;
  finalConfirmedAmount: null | number;
  currency: string;
  submittedAt: string;
  contentItems: Array<{
    id: string;
    platform: string;
    url: string;
    status: string;
    publishedAt: string;
  }>;
  referrals: Array<{
    id: string;
    discordUsername: string;
    status: string;
  }>;
  platformContentCounts: Record<string, unknown>;
  rewardBreakdown: Array<{
    type?: string;
    label?: string;
    amount?: number;
  }>;
  rewardInput: Record<string, unknown>;
};

const rewardTiers = [
  ["1K", "$10"],
  ["2K", "$15"],
  ["5K", "$25"],
  ["10K", "$40"],
  ["20K", "$60"],
  ["50K", "$80"],
  ["100K", "$100"],
];

const payoutRows = [
  ["Approved", "$4,280", "18 creators"],
  ["Ready to pay", "$2,940", "11 creators"],
  ["Paid", "$8,720", "43 creators"],
];

export function AdminDashboard({
  submissions,
}: {
  submissions: AdminSubmissionListItem[];
}) {
  const selectedSubmission = submissions[0] ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08111f] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-cyan-100/10 bg-[#0d1726] px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 text-lg font-black text-slate-950">
              V
            </div>
            <div>
              <p className="text-sm text-slate-400">Internal admin</p>
              <h1 className="text-lg font-semibold">Vmake Creator Portal</h1>
            </div>
          </div>

          <nav className="mt-10 space-y-1 text-sm">
            {["Overview", "Review Queue", "Reward Rules", "Payouts", "Audit Trail"].map(
              (item, index) => (
                <a
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                    index === 0
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
                  key={item}
                >
                  <span>{item}</span>
                  {item === "Review Queue" ? (
                    <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-semibold text-slate-950">
                      {submissions.length}
                    </span>
                  ) : null}
                </a>
              ),
            )}
          </nav>

          <div className="mt-10 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Active rule version
            </p>
            <p className="mt-2 text-lg font-semibold">2026 Creator Program V1</p>
            <p className="mt-2 text-sm text-slate-300">
              Starter bonus, milestone rewards, leaderboard bonuses, referrals.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#08111f]/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="grid gap-4 md:flex md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  Admin Domain
                </p>
                <h2 className="mt-1 max-w-4xl text-2xl font-bold leading-tight md:text-3xl">
                  Creator submissions, review, and payout operations
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:flex md:w-auto md:items-center">
                <button className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Export CSV
                </button>
                <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
                  Open review
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 md:px-8">
            <section className="grid gap-4 md:grid-cols-4" id="overview">
              {[
                ["Submitted", String(submissions.filter((item) => item.status === "submitted").length), "Awaiting review"],
                ["Under review", String(submissions.filter((item) => item.status === "under_review").length), "Needs validation"],
                ["Approved reward", formatMoney(sumAmounts(submissions.map((item) => item.finalConfirmedAmount ?? 0))), "Confirmed total"],
                ["Paid", String(submissions.filter((item) => item.status === "paid").length), "Completed payouts"],
              ].map(([label, value, detail]) => (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4" key={label}>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-bold">{value}</p>
                  <p className="mt-2 text-sm text-cyan-200">{detail}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]" id="review-queue">
              <div className="rounded-lg border border-white/10 bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
                  <div>
                    <h3 className="text-lg font-semibold">Admin review queue</h3>
                    <p className="text-sm text-slate-400">Live creator submissions</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {[
                          "Creator",
                          "Month",
                          "Platform",
                          "Posts",
                          "Views",
                          "System estimate",
                          "Final amount",
                          "Status",
                        ].map((heading) => (
                          <th className="px-4 py-3 font-semibold" key={heading}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.length === 0 ? (
                        <tr className="border-t border-white/10">
                          <td className="px-4 py-8 text-slate-400" colSpan={8}>
                            No creator submissions yet. Once creators submit from the public form,
                            they will appear here automatically.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((submission) => (
                          <tr className="border-t border-white/10" key={submission.id}>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-white">{submission.creatorName}</p>
                              <p className="text-slate-400">{submission.creatorHandle}</p>
                            </td>
                            <td className="px-4 py-4 text-slate-300">{submission.monthLabel}</td>
                            <td className="px-4 py-4 text-slate-300">
                              {submission.platforms.join(", ")}
                            </td>
                            <td className="px-4 py-4 text-white">{submission.posts}</td>
                            <td className="px-4 py-4 text-white">
                              {formatViews(submission.totalViews)}
                            </td>
                            <td className="px-4 py-4 text-cyan-200">
                              {formatMoney(submission.systemEstimatedAmount)}
                            </td>
                            <td className="px-4 py-4 text-white">
                              {submission.finalConfirmedAmount === null
                                ? "-"
                                : formatMoney(submission.finalConfirmedAmount)}
                            </td>
                            <td className="px-4 py-4">
                              <span className={statusClass(submission.status)}>
                                {humanizeStatus(submission.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#111827] p-5">
                {selectedSubmission ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Review detail</h3>
                        <p className="text-sm text-slate-400">
                          {selectedSubmission.creatorName} · {selectedSubmission.monthLabel}
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                        Rule V1
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric
                        label="System estimate"
                        value={formatMoney(selectedSubmission.systemEstimatedAmount)}
                      />
                      <Metric
                        label="Final confirmed"
                        value={
                          selectedSubmission.finalConfirmedAmount === null
                            ? "-"
                            : formatMoney(selectedSubmission.finalConfirmedAmount)
                        }
                      />
                      <Metric
                        label="Detected posts"
                        value={String(selectedSubmission.posts)}
                      />
                      <Metric
                        label="Total views"
                        value={formatViews(selectedSubmission.totalViews)}
                      />
                    </div>

                    <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Platform counts</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(selectedSubmission.platformContentCounts)
                          .filter(([, count]) => Number(count) > 0)
                          .map(([platform, count]) => (
                            <span
                              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                              key={platform}
                            >
                              {platformLabel(platform)}: {Number(count)}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {selectedSubmission.contentItems.map((item) => (
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={item.id}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.platform}</p>
                            <span className={contentStatusClass(item.status)}>{item.status}</span>
                          </div>
                          <p className="mt-2 truncate text-sm text-slate-400">{item.url}</p>
                          <p className="mt-2 text-sm text-slate-300">
                            Published {formatDate(item.publishedAt)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                      <p className="text-sm font-semibold text-amber-100">Referral usernames</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {selectedSubmission.referrals.length === 0
                          ? "No referrals submitted."
                          : selectedSubmission.referrals
                              .map((referral) => referral.discordUsername)
                              .join(", ")}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    No submission selected yet.
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5" id="reward-rules">
                <h3 className="text-lg font-semibold">Reward rules</h3>
                <p className="mt-1 text-sm text-slate-400">Versioned monthly calculation</p>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-cyan-300/10 px-3 py-3">
                    <span className="text-sm text-cyan-100">Starter bonus</span>
                    <strong>$5</strong>
                  </div>
                  {rewardTiers.map(([views, amount]) => (
                    <div
                      className="flex items-center justify-between border-b border-white/10 py-2 text-sm"
                      key={views}
                    >
                      <span className="text-slate-300">{views} views</span>
                      <span className="font-semibold text-cyan-200">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5" id="payouts">
                <h3 className="text-lg font-semibold">Payout review</h3>
                <p className="mt-1 text-sm text-slate-400">Finance-ready monthly export</p>
                <div className="mt-5 space-y-3">
                  {payoutRows.map(([label, amount, detail]) => (
                    <div className="rounded-lg border border-white/10 bg-[#0b1020] p-4" key={label}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-300">{label}</span>
                        <strong>{amount}</strong>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1020] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "under_review") {
    return "rounded-full px-3 py-1 text-xs font-semibold bg-cyan-300/15 text-cyan-200";
  }

  if (status === "approved" || status === "paid") {
    return "rounded-full px-3 py-1 text-xs font-semibold bg-emerald-300/15 text-emerald-200";
  }

  if (status === "rejected") {
    return "rounded-full px-3 py-1 text-xs font-semibold bg-red-300/15 text-red-100";
  }

  return "rounded-full px-3 py-1 text-xs font-semibold bg-violet-300/15 text-violet-200";
}

function contentStatusClass(status: string) {
  if (status === "valid") {
    return "rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-300/15 text-emerald-200";
  }

  if (status === "invalid") {
    return "rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-300/15 text-amber-200";
  }

  return "rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-300/10 text-slate-300";
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

function platformLabel(value: string) {
  if (value === "x") {
    return "X";
  }

  if (value === "lemon8") {
    return "Lemon8";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sumAmounts(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}
