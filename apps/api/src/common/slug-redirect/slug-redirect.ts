import { NOT_TRASHED } from '@/common/trash/trash';
import type { Prisma } from '@/generated/prisma/client';
import { EntityStatus, SlugRedirectResource } from '@/generated/prisma/enums';

export const syncSlugRedirects = async (
   tx: Prisma.TransactionClient,
   resource: SlugRedirectResource,
   target: { id: number; oldSlug: string | null; newSlug: string; wasPublished: boolean },
): Promise<void> => {
   const { id, oldSlug, newSlug, wasPublished } = target;

   await tx.slugRedirect.deleteMany({ where: { resource, oldSlug: newSlug } });

   if (oldSlug === null || oldSlug === newSlug || !wasPublished) return;
   await tx.slugRedirect.upsert({
      where: { resource_oldSlug: { resource, oldSlug } },
      create: { resource, oldSlug, targetId: id },
      update: { targetId: id },
   });
};

export const deleteSlugRedirects = async (
   tx: Prisma.TransactionClient,
   resource: SlugRedirectResource,
   targetId: number,
): Promise<void> => {
   await tx.slugRedirect.deleteMany({ where: { resource, targetId } });
};

export const findRedirectSlug = async (
   client: Prisma.TransactionClient,
   resource: SlugRedirectResource,
   oldSlug: string,
): Promise<string | null> => {
   const redirect = await client.slugRedirect.findUnique({
      where: { resource_oldSlug: { resource, oldSlug } },
      select: { targetId: true },
   });
   if (!redirect) return null;

   const where = { id: redirect.targetId, status: EntityStatus.published, ...NOT_TRASHED };
   const target =
      resource === SlugRedirectResource.project
         ? await client.project.findFirst({ where, select: { slug: true } })
         : await client.service.findFirst({ where, select: { slug: true } });
   return target?.slug ?? null;
};
