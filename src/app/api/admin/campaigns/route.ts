import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/server/campaignService";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());

    const campaign = await createCampaign({
      name: String(body.name ?? ""),
      rewardMonth: String(body.rewardMonth ?? ""),
      activate: String(body.activate ?? "false") === "true",
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create campaign.",
      },
      { status: 400 },
    );
  }
}
