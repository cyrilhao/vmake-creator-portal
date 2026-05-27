import { NextResponse } from "next/server";
import { buildPayoutWorkbookRows } from "@/lib/export/buildPayoutWorkbookRows";
import { exportPayoutWorkbook } from "@/lib/export/exportPayoutWorkbook";
import { listAdminSubmissions } from "@/lib/server/submissionService";

export async function GET() {
  const submissions = await listAdminSubmissions();
  const payoutRows = buildPayoutWorkbookRows(submissions);
  const workbook = exportPayoutWorkbook(payoutRows);

  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Vmake Creator Program Reward Payout.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
