import type { CacheService } from '@/cache/cache.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';
import type { StorageService } from '@/storage/storage.service';

import { FileService } from '../file.service';
import type { FileThumbnailQueue } from '../file-thumbnail.queue';

const PUBLISH_REASON = 'Used by a published project; changing it needs the publish permission';

describe('FileService.updateMany', () => {
   type PrismaMock = {
      file: { findMany: jest.Mock; update: jest.Mock };
      project: { findMany: jest.Mock };
      $executeRaw: jest.Mock;
      $queryRaw: jest.Mock;
      $transaction: jest.Mock;
   };
   let prisma: PrismaMock;
   let cache: { delPattern: jest.Mock };
   let revalidation: { revalidate: jest.Mock };
   let service: FileService;

   const fileRow = (id: number, originalName: string, displayName: string | null = null) => ({
      id,
      originalName,
      displayName,
   });

   beforeEach(() => {
      prisma = {
         file: {
            findMany: jest
               .fn()
               .mockResolvedValue([fileRow(1, 'cat.png'), fileRow(2, 'dog.png', 'Dog')]),
            update: jest.fn(({ where, data }: { where: { id: number }; data: object }) =>
               Promise.resolve({ id: where.id, ...data }),
            ),
         },
         project: { findMany: jest.fn().mockResolvedValue([]) },
         $executeRaw: jest.fn().mockResolvedValue(1),
         $queryRaw: jest.fn().mockResolvedValue([{ status: 'draft', slug: 'p' }]),
         $transaction: jest.fn(),
      };
      prisma.$transaction.mockImplementation((fn: (tx: PrismaMock) => unknown) => fn(prisma));
      cache = { delPattern: jest.fn().mockResolvedValue(undefined) };
      revalidation = { revalidate: jest.fn() };

      service = new FileService(
         prisma as unknown as PrismaService,
         {} as StorageService,
         {} as FileThumbnailQueue,
         cache as unknown as CacheService,
         revalidation as unknown as RevalidationService,
         { publish: jest.fn() } as never,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
      );
   });

   it('updates every file and invalidates the public content once', async () => {
      const result = await service.updateMany(
         [
            { id: 1, displayName: 'Cat' },
            { id: 2, altText: '  ' },
         ],
         false,
      );

      expect(result).toEqual({
         updated: [
            { id: 1, displayName: 'Cat' },
            { id: 2, altText: null },
         ],
         failed: [],
      });
      expect(cache.delPattern).toHaveBeenCalledTimes(1);
      expect(revalidation.revalidate).toHaveBeenCalledWith('projects');
   });

   it('stores a trimmed display name, and a blank one as null', async () => {
      const result = await service.updateMany(
         [
            { id: 1, displayName: '  Cat  ' },
            { id: 2, displayName: '  ' },
         ],
         true,
      );

      expect(result.updated).toEqual([
         { id: 1, displayName: 'Cat' },
         { id: 2, displayName: null },
      ]);
   });

   it('takes the original name of a file with an empty display name as its name', async () => {
      prisma.file.findMany.mockResolvedValue([fileRow(1, 'cat.png', '')]);

      const result = await service.updateMany(
         [{ id: 1, expectedName: 'cat.png', displayName: 'Cat' }],
         true,
      );

      expect(result).toEqual({ updated: [{ id: 1, displayName: 'Cat' }], failed: [] });
   });

   it('writes nothing when one of the files does not exist', async () => {
      const result = await service.updateMany(
         [
            { id: 1, displayName: 'Cat' },
            { id: 9, displayName: 'Missing' },
         ],
         true,
      );

      expect(result).toEqual({ updated: [], failed: [{ id: 9, reason: 'File not found' }] });
      expect(prisma.file.update).not.toHaveBeenCalled();
      expect(cache.delPattern).not.toHaveBeenCalled();
      expect(revalidation.revalidate).not.toHaveBeenCalled();
   });

   it('compares expectedName with the display name, or the original name without one', async () => {
      const result = await service.updateMany(
         [
            { id: 1, expectedName: 'cat.png', displayName: 'Cat' },
            { id: 2, expectedName: 'dog.png', displayName: 'Doggo' },
         ],
         true,
      );

      expect(result).toEqual({
         updated: [],
         failed: [{ id: 2, reason: 'The file is now named "Dog", not "dog.png"' }],
      });
      expect(prisma.file.update).not.toHaveBeenCalled();
   });

   it('refuses the files of a published project without the publish permission', async () => {
      prisma.project.findMany.mockResolvedValue([
         { id: 5, thumbnailId: 1, media: [{ fileId: 2 }, { fileId: 3 }] },
      ]);
      prisma.$queryRaw.mockResolvedValue([{ status: 'published', slug: 'p' }]);

      const result = await service.updateMany([{ id: 1, displayName: 'Cat' }], false);

      expect(result).toEqual({ updated: [], failed: [{ id: 1, reason: PUBLISH_REASON }] });
      expect(prisma.file.update).not.toHaveBeenCalled();
   });

   it('lets the publish permission change the files of a published project', async () => {
      prisma.project.findMany.mockResolvedValue([{ id: 5, thumbnailId: 1, media: [] }]);
      prisma.$queryRaw.mockResolvedValue([{ status: 'published', slug: 'p' }]);

      const result = await service.updateMany([{ id: 1, displayName: 'Cat' }], true);

      expect(result).toEqual({ updated: [{ id: 1, displayName: 'Cat' }], failed: [] });
   });

   it('lets the update permission alone change the files of a draft project', async () => {
      prisma.project.findMany.mockResolvedValue([
         { id: 5, thumbnailId: null, media: [{ fileId: 1 }] },
      ]);

      const result = await service.updateMany([{ id: 1, displayName: 'Cat' }], false);

      expect(result).toEqual({ updated: [{ id: 1, displayName: 'Cat' }], failed: [] });
   });

   it('locks every project that shows the files, in id order', async () => {
      prisma.project.findMany.mockResolvedValue([
         { id: 4, thumbnailId: 1, media: [] },
         { id: 6, thumbnailId: null, media: [{ fileId: 2 }] },
      ]);

      await service.updateMany([{ id: 1 }, { id: 2 }], false);

      expect(prisma.project.findMany).toHaveBeenCalledWith(
         expect.objectContaining({ orderBy: { id: 'asc' } }),
      );
      const calls = prisma.$queryRaw.mock.calls.map(
         ([sql]: [{ sql: string; values: unknown[] }]) => sql,
      );
      expect(calls.map(({ values }) => values)).toEqual([[4], [6], [1], [2]]);
      expect(calls.slice(2).map(({ sql }) => sql)).toEqual([
         expect.stringContaining('UPDATE files SET version = version + 1'),
         expect.stringContaining('UPDATE files SET version = version + 1'),
      ]);
   });
});
