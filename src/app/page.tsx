const submissions = [
  {
    creator: "Mia Chen",
    handle: "@mia.makes",
    month: "May 2026",
    platforms: "TikTok, Instagram",
    posts: 12,
    views: "128.4K",
    estimate: "$135",
    final: "$120",
    status: "Under review",
    tone: "cyan",
  },
  {
    creator: "Leo Park",
    handle: "@leo.ai.video",
    month: "May 2026",
    platforms: "YouTube",
    posts: 5,
    views: "52.8K",
    estimate: "$80",
    final: "-",
    status: "Submitted",
    tone: "violet",
  },
  {
    creator: "Ava Brooks",
    handle: "@avaworkflow",
    month: "May 2026",
    platforms: "Instagram, YouTube",
    posts: 10,
    views: "96.2K",
    estimate: "$130",
    final: "$130",
    status: "Approved",
    tone: "emerald",
  },
];

const rewardTiers = [
  ["1K", "$10"],
  ["2K", "$15"],
  ["5K", "$25"],
  ["10K", "$40"],
  ["20K", "$60"],
  ["50K", "$80"],
  ["100K", "$100"],
];

const contentItems = [
  {
    platform: "TikTok",
    url: "tiktok.com/@mia/video/721",
    views: "64,220",
    status: "Valid",
  },
  {
    platform: "Instagram",
    url: "instagram.com/reel/vmake-flow",
    views: "38,910",
    status: "Pending",
  },
  {
    platform: "YouTube",
    url: "youtube.com/watch?v=vmake-demo",
    views: "25,310",
    status: "Flagged",
  },
];

const payoutRows = [
  ["Approved", "$4,280", "18 creators"],
  ["Ready to pay", "$2,940", "11 creators"],
  ["Paid", "$8,720", "43 creators"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b1020] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#0f172a] px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 text-lg font-black">
              V
            </div>
            <div>
              <p className="text-sm text-slate-400">Vmake.ai</p>
              <h1 className="text-lg font-semibold">Creator Portal</h1>
            </div>
          </div>

          <nav className="mt-10 space-y-1 text-sm">
            {["Overview", "Creator Submit", "Admin Review", "Reward Rules", "Payouts", "Audit Trail"].map(
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
                  {index === 2 ? (
                    <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
                      12
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
              Starter bonus, view milestones, leaderboard bonuses, referrals.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1020]/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="grid gap-4 md:flex md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                  Vmake Creator Portal
                </p>
                <h2 className="mt-1 max-w-4xl text-2xl font-bold leading-tight md:text-3xl">
                  <span className="md:hidden">Creator rewards and payouts</span>
                  <span className="hidden md:inline">
                    Creator rewards, review, and payout operations
                  </span>
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:flex md:w-auto md:items-center">
                <button className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Export CSV
                </button>
                <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
                  New submission
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 md:px-8">
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Submitted", "74", "+18 this week"],
                ["Under review", "12", "6 flagged posts"],
                ["Approved reward", "$15.9K", "May cycle"],
                ["Paid", "$8.7K", "43 creators"],
              ].map(([label, value, detail]) => (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4" key={label}>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-bold">{value}</p>
                  <p className="mt-2 text-sm text-cyan-200">{detail}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
              <div className="rounded-lg border border-white/10 bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
                  <div>
                    <h3 className="text-lg font-semibold">Admin review queue</h3>
                    <p className="text-sm text-slate-400">
                      May 2026 creator submissions
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {["Month", "Status", "Platform", "Reward"].map((filter) => (
                      <button
                        className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/10"
                        key={filter}
                      >
                        {filter}
                      </button>
                    ))}
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
                      {submissions.map((submission) => (
                        <tr className="border-t border-white/10" key={submission.creator}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-white">{submission.creator}</p>
                            <p className="text-slate-400">{submission.handle}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-300">{submission.month}</td>
                          <td className="px-4 py-4 text-slate-300">{submission.platforms}</td>
                          <td className="px-4 py-4 text-white">{submission.posts}</td>
                          <td className="px-4 py-4 text-white">{submission.views}</td>
                          <td className="px-4 py-4 text-cyan-200">{submission.estimate}</td>
                          <td className="px-4 py-4 text-white">{submission.final}</td>
                          <td className="px-4 py-4">
                            <span className={statusClass(submission.status)}>
                              {submission.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#111827] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Review detail</h3>
                    <p className="text-sm text-slate-400">Mia Chen · May 2026</p>
                  </div>
                  <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Rule V1
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Metric label="System estimate" value="$135" />
                  <Metric label="Final confirmed" value="$120" />
                  <Metric label="Valid posts" value="11 / 12" />
                  <Metric label="Total views" value="128.4K" />
                </div>

                <div className="mt-5 space-y-3">
                  {contentItems.map((item) => (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3" key={item.url}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.platform}</p>
                        <span className={contentStatusClass(item.status)}>{item.status}</span>
                      </div>
                      <p className="mt-2 truncate text-sm text-slate-400">{item.url}</p>
                      <p className="mt-2 text-sm text-slate-300">{item.views} views</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Manual adjustment</p>
                  <p className="mt-2 text-sm text-slate-300">
                    -$15 · One YouTube post requires additional proof before payout.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button className="rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                    Reject
                  </button>
                  <button className="rounded-lg bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-200">
                    Confirm reward
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold">Creator submission</h3>
                <p className="mt-1 text-sm text-slate-400">Mobile-friendly monthly entry</p>

                <div className="mt-5 rounded-lg border border-white/10 bg-[#0b1020] p-4">
                  <label className="text-sm font-medium text-slate-300">Reward month</label>
                  <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm">
                    May 2026
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Platform" value="TikTok" />
                    <Field label="Monthly views" value="64,220" />
                  </div>

                  <div className="mt-4">
                    <Field label="Content URL" value="https://www.tiktok.com/@mia/video/721" />
                  </div>

                  <div className="mt-4 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">
                    Estimated reward updates after valid content is reviewed.
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-semibold">Reward rules</h3>
                  <p className="mt-1 text-sm text-slate-400">Versioned monthly calculation</p>
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-fuchsia-300/10 px-3 py-3">
                      <span className="text-sm text-fuchsia-100">Starter bonus</span>
                      <strong>$5</strong>
                    </div>
                    {rewardTiers.map(([views, reward]) => (
                      <div className="flex items-center justify-between border-b border-white/10 py-2 text-sm" key={views}>
                        <span className="text-slate-300">{views} views</span>
                        <span className="font-semibold text-cyan-200">{reward}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-semibold">Payout review</h3>
                  <p className="mt-1 text-sm text-slate-400">Finance-ready monthly export</p>
                  <div className="mt-5 space-y-3">
                    {payoutRows.map(([label, amount, count]) => (
                      <div className="rounded-lg border border-white/10 bg-[#0b1020] p-4" key={label}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-300">{label}</span>
                          <strong>{amount}</strong>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{count}</p>
                      </div>
                    ))}
                  </div>
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
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="mt-2 block rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white">
        {value}
      </span>
    </label>
  );
}

function statusClass(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";

  if (status === "Approved") {
    return `${base} bg-emerald-300/15 text-emerald-200`;
  }

  if (status === "Under review") {
    return `${base} bg-cyan-300/15 text-cyan-200`;
  }

  return `${base} bg-violet-300/15 text-violet-200`;
}

function contentStatusClass(status: string) {
  const base = "rounded-full px-2.5 py-1 text-xs font-semibold";

  if (status === "Valid") {
    return `${base} bg-emerald-300/15 text-emerald-200`;
  }

  if (status === "Flagged") {
    return `${base} bg-amber-300/15 text-amber-200`;
  }

  return `${base} bg-slate-300/10 text-slate-300`;
}
