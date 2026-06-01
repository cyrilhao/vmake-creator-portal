import { prisma } from "@/lib/prisma";

export type CampaignSummary = {
  id: string;
  name: string;
  rewardMonth: string;
  status: "draft" | "active" | "archived";
  isActive: boolean;
};

export async function getActiveCampaign() {
  const campaign = await prisma.campaign.findFirst({
    where: {
      isActive: true,
      status: "active",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (campaign) {
    return campaign;
  }

  return ensureDefaultCampaign();
}

export async function listCampaigns(): Promise<CampaignSummary[]> {
  let campaigns = await prisma.campaign.findMany({
    orderBy: [
      { isActive: "desc" },
      { updatedAt: "desc" },
    ],
  });

  if (campaigns.length === 0) {
    await ensureDefaultCampaign();
    campaigns = await prisma.campaign.findMany({
      orderBy: [
        { isActive: "desc" },
        { updatedAt: "desc" },
      ],
    });
  }

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    rewardMonth: campaign.rewardMonth,
    status: campaign.status,
    isActive: campaign.isActive,
  }));
}

export async function createCampaign(input: { name: string; rewardMonth: string; activate?: boolean }) {
  const name = input.name.trim();
  const rewardMonth = input.rewardMonth.trim();

  if (!name) {
    throw new Error("Campaign name is required.");
  }

  if (!/^\d{4}-\d{2}$/.test(rewardMonth)) {
    throw new Error("Campaign reward month must use YYYY-MM.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.activate) {
      await tx.campaign.updateMany({
        data: {
          isActive: false,
        },
      });
    }

    const existing = await tx.campaign.findUnique({
      where: {
        name,
      },
    });

    if (existing) {
      return tx.campaign.update({
        where: {
          id: existing.id,
        },
        data: {
          rewardMonth,
          status: input.activate ? "active" : existing.status,
          isActive: Boolean(input.activate),
        },
      });
    }

    return tx.campaign.create({
      data: {
        name,
        rewardMonth,
        status: input.activate ? "active" : "draft",
        isActive: Boolean(input.activate),
      },
    });
  });
}

export async function activateCampaign(campaignId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.campaign.updateMany({
      data: {
        isActive: false,
        status: "archived",
      },
      where: {
        isActive: true,
      },
    });

    return tx.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        isActive: true,
        status: "active",
      },
    });
  });
}

async function ensureDefaultCampaign() {
  const defaultCampaign = await prisma.campaign.findUnique({
    where: {
      name: "May 2026 Creator Campaign",
    },
  });

  if (defaultCampaign) {
    if (!defaultCampaign.isActive || defaultCampaign.status !== "active") {
      return prisma.campaign.update({
        where: {
          id: defaultCampaign.id,
        },
        data: {
          isActive: true,
          status: "active",
        },
      });
    }

    return defaultCampaign;
  }

  return prisma.campaign.create({
    data: {
      name: "May 2026 Creator Campaign",
      rewardMonth: "2026-05",
      status: "active",
      isActive: true,
    },
  });
}
