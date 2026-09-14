import { prisma } from '../database/client.js';

export interface OrganizationPublicLinkState {
  publicLink: string | null;
  transparencyActive: boolean;
}

const publicLinkStateSelection = {
  publicLink: true,
  transparencyActive: true,
} as const;

export async function findPublicLinkState(
  organizationId: bigint,
): Promise<OrganizationPublicLinkState | null> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: publicLinkStateSelection,
  });
}

export async function replacePublicLinkAndActivate(
  organizationId: bigint,
  publicLink: string,
): Promise<OrganizationPublicLinkState> {
  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      publicLink,
      transparencyActive: true,
    },
    select: publicLinkStateSelection,
  });
}

export async function setTransparencyActive(
  organizationId: bigint,
  active: boolean,
): Promise<OrganizationPublicLinkState> {
  return prisma.organization.update({
    where: { id: organizationId },
    data: { transparencyActive: active },
    select: publicLinkStateSelection,
  });
}
