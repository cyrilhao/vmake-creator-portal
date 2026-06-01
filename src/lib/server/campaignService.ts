import { prisma } from "@/lib/prisma";

export type CampaignSummary = {
  id: string;
  name: string;
  rewardMonth: string;
  status: "draft" | "active" | "archived";
  isActive: boolean;
};

export async function getActiveCampaigns() {
  let campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      status: "active",
    },
    orderBy: [
      { rewardMonth: "desc" },
      { updatedAt: "desc" },
    ],
  });

  if (campaigns.length > 0) {
    return campaigns;
  }

  const defaultCampaign = await ensureDefaultCampaign();
  return [defaultCampaign];
}

export async function getActiveCampaign() {
  const campaigns = await getActiveCampaigns();
  return campaigns[0] ?? null;
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
  const rewardMonth = normalizeRewardMonthInput(input.rewardMonth);

  if (!name) {
    throw new Error("Campaign name is required.");
  }

  if (!rewardMonth) {
    throw new Error("Campaign reward month must use MM-YY.");
  }

  return prisma.$transaction(async (tx) => {
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

export function formatRewardMonthShort(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[1].slice(2)}`;
}

function normalizeRewardMonthInput(value: string) {
  const normalized = value.trim();

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const shortMatch = normalized.match(/^(\d{2})-(\d{2})$/);

  if (!shortMatch) {
    return null;
  }

  const [, month, year] = shortMatch;

  if (Number(month) < 1 || Number(month) > 12) {
    return null;
  }

  return `20${year}-${month}`;
}

export async function activateCampaign(campaignId: string) {
  return prisma.campaign.update({
    where: {
      id: campaignId,
    },
    data: {
      isActive: true,
      status: "active",
    },
  });
}

export async function endCampaign(campaignId: string) {
  return prisma.campaign.update({
    where: {
      id: campaignId,
    },
    data: {
      isActive: false,
      status: "archived",
    },
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
