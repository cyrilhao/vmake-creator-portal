import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { buildPayoutWorkbookRows } from "@/lib/export/buildPayoutWorkbookRows";
import {
  getAdminHostnames,
  isAdminHostname,
  resolveRequestHostname,
} from "@/lib/access/hostAccess";
import { listCampaigns } from "@/lib/server/campaignService";
import { listAdminSubmissions } from "@/lib/server/submissionService";

export default async function AdminPage() {
  const headerStore = await headers();
  const hostname = resolveRequestHostname(headerStore);
  const adminHostnames = getAdminHostnames(process.env.ADMIN_APP_HOSTNAMES);

  if (adminHostnames.length > 0 && !isAdminHostname(hostname, adminHostnames)) {
    redirect("/");
  }

  const submissions = await listAdminSubmissions();
  const payoutRows = buildPayoutWorkbookRows(submissions);
  const campaigns = await listCampaigns();

  return <AdminDashboard submissions={submissions} payoutRows={payoutRows} campaigns={campaigns} />;
}
