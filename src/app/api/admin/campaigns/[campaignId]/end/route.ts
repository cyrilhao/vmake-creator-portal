import { NextResponse } from "next/server";
import { endCampaign } from "@/lib/server/campaignService";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      campaignId: string;
    }>;
  },
) {
  try {
    const { campaignId } = await context.params;
    const campaign = await endCampaign(campaignId);

    return NextResponse.json({
      ok: true,
      campaign,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to end campaign.",
      },
      { status: 400 },
    );
  }
}
