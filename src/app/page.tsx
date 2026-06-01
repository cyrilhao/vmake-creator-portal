import { headers } from "next/headers";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { DiscordSignInButton } from "@/components/auth/DiscordSignInButton";
import { DiscordSignOutButton } from "@/components/auth/DiscordSignOutButton";
import { CreatorSubmissionForm } from "@/components/creator/CreatorSubmissionForm";
import { getSessionCreator, getServerAuthSession } from "@/lib/auth";
import {
  getAdminHostnames,
  isAdminHostname,
  resolveRequestHostname,
} from "@/lib/access/hostAccess";
import { buildPayoutWorkbookRows } from "@/lib/export/buildPayoutWorkbookRows";
import { getActiveCampaign, listCampaigns } from "@/lib/server/campaignService";
import { listAdminSubmissions, listCreatorSubmissions } from "@/lib/server/submissionService";

const supportedPlatforms = ["X", "Instagram", "TikTok", "YouTube", "Pinterest", "Lemon8", "Threads"];

const submissionSteps = [
  {
    title: "Sign in with Discord",
    body: "Your Discord account becomes your creator identity and lets you see your past campaign submissions.",
  },
  {
    title: "Submit campaign data",
    body: "Paste all links in bulk, enter your total monthly views, and upload analytics screenshots for each platform used.",
  },
  {
    title: "Admin confirms payout",
    body: "Your submission is reviewed internally before any final reward amount is approved.",
  },
];

export default async function HomePage() {
  const headerStore = await headers();
  const hostname = resolveRequestHostname(headerStore);
  const adminHostnames = getAdminHostnames(process.env.ADMIN_APP_HOSTNAMES);

  if (isAdminHostname(hostname, adminHostnames)) {
    const submissions = await listAdminSubmissions();
    const payoutRows = buildPayoutWorkbookRows(submissions);
    const campaigns = await listCampaigns();
    return <AdminDashboard submissions={submissions} payoutRows={payoutRows} campaigns={campaigns} />;
  }

  const discordAuthConfigured = Boolean(
    process.env.DISCORD_CLIENT_ID &&
      process.env.DISCORD_CLIENT_SECRET &&
      process.env.NEXTAUTH_SECRET,
  );
  const session = discordAuthConfigured ? await getServerAuthSession() : null;
  const creator = getSessionCreator(session);
  const activeCampaign = await getActiveCampaign();
  const submissionHistory = creator
    ? await listCreatorSubmissions(creator.discordUserId)
    : [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(180deg,_#071120_0%,_#0d1526_48%,_#08101c_100%)] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 text-lg font-black text-slate-950">
              V
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Vmake.ai</p>
              <h1 className="text-lg font-semibold">Vmake Creator Portal</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:px-8 lg:py-14">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Creator submission only
            </span>
            {creator ? (
              <DiscordSignOutButton />
            ) : discordAuthConfigured ? (
              <DiscordSignInButton />
            ) : null}
          </div>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Submit your Vmake campaign content for reward review.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            This public portal is only for creators. Sign in with Discord, submit your campaign
            links, monthly total views, referral creators, and platform analytics screenshots.
            Reward estimates stay internal and are confirmed later by the admin team.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {supportedPlatforms.map((platform) => (
              <span
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-200"
                key={platform}
              >
                {platform}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {submissionSteps.map((step, index) => (
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4" key={step.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  0{index + 1}
                </p>
                <h3 className="mt-3 text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0b1020]/90 p-5 shadow-[0_24px_80px_rgba(8,15,28,0.45)] sm:p-6" id="creator-submit">
          <div className="border-b border-white/10 pb-4">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Active campaign</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Creator submission</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {activeCampaign
                ? `${activeCampaign.name} is currently open. Final payout is confirmed after internal review.`
                : "No campaign is active right now. Ask the admin team to open the next campaign."}
            </p>
          </div>

          <div className="mt-5">
            {creator && activeCampaign ? (
              <CreatorSubmissionForm
                campaign={{
                  id: activeCampaign.id,
                  name: activeCampaign.name,
                  rewardMonth: activeCampaign.rewardMonth,
                }}
                creator={creator}
                submissionHistory={submissionHistory}
              />
            ) : !discordAuthConfigured ? (
              <div className="space-y-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5">
                <p className="text-sm text-amber-50">
                  Discord sign-in is coded and ready, but the live Discord OAuth app credentials
                  still need to be connected before creators can log in here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-300">
                  Sign in with Discord to submit content and see your past campaign records.
                </p>
                <DiscordSignInButton />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
