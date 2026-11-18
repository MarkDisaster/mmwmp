import { ConflictException, NotFoundException } from '@nestjs/common';

import type { CacheService } from '@/cache/cache.service';
import { EntityStatus, SlugRedirectResource } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';

import { SlugRedirectService } from '../slug-redirect.service';

describe('SlugRedirectService', () => {
   let prisma: {
      slugRedirect: {
         findMany: jest.Mock;
         count: jest.Mock;
         findFirst: jest.Mock;
         deleteMany: jest.Mock;
      };
      project: { findMany: jest.Mock };
      service: { findMany: jest.Mock };
      $transaction: jest.Mock;
   };
   let revalidation: { revalidate: jest.Mock };
   let cache: { delPattern: jest.Mock };
   let service: SlugRedirectService;

   beforeEach(() => {
      prisma = {
         slugRedirect: {
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            findFirst: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
         },
         project: { findMany: jest.fn().mockResolvedValue([]) },
         service: { findMany: jest.fn().mockResolvedValue([]) },
         $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
      };
      revalidation = { revalidate: jest.fn() };
      cache = { delPattern: jest.fn().mockResolvedValue(undefined) };
      service = new SlugRedirectService(
         prisma as unknown as PrismaService,
         revalidation as unknown as RevalidationService,
         cache as unknown as CacheService,
      );
   });

   const redirect = (id: number, targetId: number) => ({
      id,
      resource: SlugRedirectResource.project,
      oldSlug: `old-${id}`,
      targetId,
      createdAt: new Date('2026-01-01'),
   });

   it('reports the state of every target: published, draft, trashed, missing', async () => {
      prisma.slugRedirect.findMany.mockResolvedValue([
         redirect(1, 10),
         redirect(2, 11),
         redirect(3, 12),
         redirect(4, 13),
      ]);
      prisma.slugRedirect.count.mockResolvedValue(4);
      prisma.project.findMany.mockResolvedValue([
         { id: 10, title: 'A', slug: 'a', status: EntityStatus.published, deletedAt: null },
         { id: 11, title: 'B', slug: 'b', status: EntityStatus.draft, deletedAt: null },
         {
            id: 12,
            title: 'C',
            slug: 'c--trashed-12',
            status: EntityStatus.draft,
            deletedAt: new Date(),
         },
      ]);

      const result = await service.findAll(SlugRedirectResource.project, { page: 0, limit: 20 });

      expect(result.totalCount).toBe(4);
      expect(result.data.map((r) => [r.targetState, r.targetSlug])).toEqual([
         ['published', 'a'],
         ['draft', 'b'],
         ['trashed', null],
         ['missing', null],
      ]);
      expect(prisma.service.findMany).not.toHaveBeenCalled();
   });

   it('filters by resource and searches the old slug', async () => {
      await service.findAll(SlugRedirectResource.service, { page: 1, limit: 10, search: ' Foo ' });

      expect(prisma.slugRedirect.findMany).toHaveBeenCalledWith(
         expect.objectContaining({
            where: {
               resource: SlugRedirectResource.service,
               OR: [{ oldSlug: { contains: 'Foo', mode: 'insensitive' } }],
            },
            skip: 10,
            take: 10,
         }),
      );
      expect(prisma.project.findMany).not.toHaveBeenCalled();
   });

   it('deletes a redirect and revalidates the tag of its resource', async () => {
      prisma.slugRedirect.findFirst.mockResolvedValue(redirect(5, 9));

      const removed = await service.remove(SlugRedirectResource.project, 5, 'old-5');

      expect(prisma.slugRedirect.deleteMany).toHaveBeenCalledWith({
         where: { id: 5, resource: SlugRedirectResource.project },
      });
      expect(revalidation.revalidate).toHaveBeenCalledWith('projects');
      expect(cache.delPattern).toHaveBeenCalledWith('projects:*');
      expect(cache.delPattern.mock.invocationCallOrder[0]).toBeLessThan(
         revalidation.revalidate.mock.invocationCallOrder[0],
      );
      expect(removed).toEqual({ id: 5, oldSlug: 'old-5', targetId: 9 });
   });

   it('drops the cached redirects of services when a service redirect is deleted', async () => {
      prisma.slugRedirect.findFirst.mockResolvedValue({
         ...redirect(6, 3),
         resource: SlugRedirectResource.service,
      });

      await service.remove(SlugRedirectResource.service, 6);

      expect(cache.delPattern).toHaveBeenCalledWith('services:*');
      expect(cache.delPattern).not.toHaveBeenCalledWith('projects:*');
      expect(revalidation.revalidate).toHaveBeenCalledWith('services');
   });

   it('answers 404 for a missing redirect and when it was deleted concurrently', async () => {
      prisma.slugRedirect.findFirst.mockResolvedValue(null);
      await expect(service.remove(SlugRedirectResource.service, 1)).rejects.toThrow(
         NotFoundException,
      );

      prisma.slugRedirect.findFirst.mockResolvedValue(redirect(1, 2));
      prisma.slugRedirect.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove(SlugRedirectResource.project, 1)).rejects.toThrow(
         NotFoundException,
      );
      expect(revalidation.revalidate).not.toHaveBeenCalled();
      expect(cache.delPattern).not.toHaveBeenCalled();
   });

   it('refuses to delete a redirect that is another slug than the approved one', async () => {
      prisma.slugRedirect.findFirst.mockResolvedValue(redirect(1, 2));

      await expect(service.remove(SlugRedirectResource.project, 1, 'other')).rejects.toThrow(
         ConflictException,
      );
      expect(prisma.slugRedirect.deleteMany).not.toHaveBeenCalled();
   });
});
