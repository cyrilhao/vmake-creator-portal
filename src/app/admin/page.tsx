import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { buildPayoutWorkbookRows } from "@/lib/export/buildPayoutWorkbookRows";
import { isAdminHostname, parseHostnameList } from "@/lib/access/hostAccess";
import { listAdminSubmissions } from "@/lib/server/submissionService";

export default async function AdminPage() {
  const headerStore = await headers();
  const hostname = headerStore.get("host") ?? "";
  const adminHostnames = parseHostnameList(process.env.ADMIN_APP_HOSTNAMES);

  if (adminHostnames.length > 0 && !isAdminHostname(hostname, adminHostnames)) {
    redirect("/");
  }

  const submissions = await listAdminSubmissions();
  const payoutRows = buildPayoutWorkbookRows(submissions);

  return <AdminDashboard submissions={submissions} payoutRows={payoutRows} />;
}
