import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { CacheService } from '@/cache/cache.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';
import type { StorageService } from '@/storage/storage.service';

import { FileService } from '../file.service';
import type { FileThumbnailQueue } from '../file-thumbnail.queue';

describe('FileService public content invalidation', () => {
   const storedFile = {
      id: 7,
      filename: 'uuid',
      originalName: 'cat.png',
      displayName: null,
      mimeType: 'image/png',
      size: 3,
      width: 100,
      height: 100,
      storagePath: 'uploads/uuid',
      language: null,
      processingStatus: 'READY',
      processingError: null,
      createdById: 1,
      createdBy: { id: 1, firstName: 'a', lastName: 'b', email: 'c@d.e' },
      createdAt: new Date('2026-01-01'),
      variants: [],
   };

   type PrismaMock = {
      file: {
         findUnique: jest.Mock;
         findUniqueOrThrow: jest.Mock;
         update: jest.Mock;
         delete: jest.Mock;
         deleteMany: jest.Mock;
      };
      project: { findMany: jest.Mock; count: jest.Mock };
      projectMedia: { count: jest.Mock };
      $executeRaw: jest.Mock;
      $queryRaw: jest.Mock;
      $transaction: jest.Mock;
   };
   let prisma: PrismaMock;
   let storage: { delete: jest.Mock; deleteFolder: jest.Mock; getPublicUrl: jest.Mock };
   let cache: { delPattern: jest.Mock };
   let revalidation: { revalidate: jest.Mock };
   let service: FileService;

   beforeEach(() => {
      prisma = {
         file: {
            findUnique: jest.fn().mockResolvedValue(storedFile),
            update: jest.fn().mockResolvedValue(storedFile),
            delete: jest.fn().mockResolvedValue(undefined),
            findUniqueOrThrow: jest.fn().mockResolvedValue(storedFile),
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
         },
         project: {
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
         },
         projectMedia: { count: jest.fn().mockResolvedValue(0) },
         $executeRaw: jest.fn().mockResolvedValue(1),
         $queryRaw: jest.fn().mockResolvedValue([{ status: 'draft' }]),
         $transaction: jest.fn(),
      };
      prisma.$transaction.mockImplementation((fn: (tx: PrismaMock) => unknown) => fn(prisma));
      storage = {
         delete: jest.fn().mockResolvedValue(undefined),
         deleteFolder: jest.fn().mockResolvedValue(undefined),
         getPublicUrl: jest.fn((p: string) => `https://cdn/${p}`),
      };
      cache = { delPattern: jest.fn().mockResolvedValue(undefined) };
      revalidation = { revalidate: jest.fn() };

      service = new FileService(
         prisma as unknown as PrismaService,
         storage as unknown as StorageService,
         {} as FileThumbnailQueue,
         cache as unknown as CacheService,
         revalidation as unknown as RevalidationService,
         { publish: jest.fn() } as never,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
      );
   });

   const expectInvalidated = () => {
      expect(cache.delPattern).toHaveBeenCalledWith('projects:*');
      expect(revalidation.revalidate).toHaveBeenCalledWith('projects');
   };

   it('invalidates Redis before revalidating the web', async () => {
      const order: string[] = [];
      cache.delPattern.mockImplementation(async () => {
         order.push('redis');
      });
      revalidation.revalidate.mockImplementation(() => {
         order.push('web');
      });

      await service.invalidatePublicContent();

      expect(order).toEqual(['redis', 'web']);
   });

   it('does not touch the services cache (service responses embed no files)', async () => {
      await service.invalidatePublicContent();

      expect(cache.delPattern).not.toHaveBeenCalledWith('services:*');
      expect(revalidation.revalidate).not.toHaveBeenCalledWith('services');
   });

   it('invalidates after displayName changes (it is the image alt text)', async () => {
      await service.update(7, { displayName: 'New alt' }, false);

      expectInvalidated();
   });

   it('stores a trimmed display name, and a blank one as null', async () => {
      await service.update(7, { displayName: '  New alt  ' }, false);
      await service.update(7, { displayName: '  ' }, false);

      const names = prisma.file.update.mock.calls.map(
         ([args]: [{ data: { displayName: unknown } }]) => args.data.displayName,
      );
      expect(names).toEqual(['New alt', null]);
   });

   describe('update and the publish permission', () => {
      it('refuses a file of a published project without publish and changes nothing', async () => {
         prisma.project.findMany.mockResolvedValue([{ id: 3 }]);
         prisma.$queryRaw.mockResolvedValue([{ status: 'published' }]);

         await expect(service.update(7, { displayName: 'New alt' }, false)).rejects.toBeInstanceOf(
            ForbiddenException,
         );

         expect(prisma.file.update).not.toHaveBeenCalled();
         expect(cache.delPattern).not.toHaveBeenCalled();
      });

      it('allows a file of a published project with publish', async () => {
         prisma.project.findMany.mockResolvedValue([{ id: 3 }]);
         prisma.$queryRaw.mockResolvedValue([{ status: 'published' }]);

         await service.update(7, { displayName: 'New alt' }, true);

         expect(prisma.file.update).toHaveBeenCalledTimes(1);
      });

      it('allows a file used only by drafts without publish', async () => {
         prisma.project.findMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
         prisma.$queryRaw.mockResolvedValue([{ status: 'draft' }]);

         await service.update(7, { displayName: 'New alt' }, false);

         expect(prisma.file.update).toHaveBeenCalledTimes(1);
      });
   });

   describe('trash and restore (reach the public endpoints like an edit of the file)', () => {
      it('invalidates after a file moves to the trash and after it comes back', async () => {
         await service.trash(7, 1, false);
         expectInvalidated();
         expect(prisma.file.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { deletedAt: expect.any(Date), deletedById: 1 } }),
         );

         cache.delPattern.mockClear();
         revalidation.revalidate.mockClear();
         await service.restore(7, false);
         expectInvalidated();
      });

      it('refuses the trash for a file of a published project without publish', async () => {
         prisma.project.findMany.mockResolvedValue([{ id: 3 }]);
         prisma.$queryRaw.mockResolvedValue([{ status: 'published' }]);

         await expect(service.trash(7, 1, false)).rejects.toBeInstanceOf(ForbiddenException);

         expect(prisma.file.update).not.toHaveBeenCalled();
         expect(cache.delPattern).not.toHaveBeenCalled();
      });

      it('answers 404 for a file that is not live (or not in the trash for a restore)', async () => {
         prisma.file.findUnique.mockResolvedValue(null);

         await expect(service.trash(7, 1, true)).rejects.toBeInstanceOf(NotFoundException);
         await expect(service.restore(7, true)).rejects.toBeInstanceOf(NotFoundException);
      });
   });

   describe('removePermanently', () => {
      beforeEach(() => {
         prisma.$queryRaw.mockResolvedValue([{ id: 7 }]);
      });

      it('deletes the row first, then cleans up storage', async () => {
         const order: string[] = [];
         prisma.file.deleteMany.mockImplementation(async () => {
            order.push('db');
            return { count: 1 };
         });
         storage.delete.mockImplementation(async () => {
            order.push('storage');
         });

         await service.removePermanently(7);

         expect(order).toEqual(['db', 'storage']);
         expect(prisma.file.deleteMany).toHaveBeenCalledWith({
            where: { id: 7, deletedAt: { not: null } },
         });
      });

      it('removes the whole folder when the file has variants', async () => {
         prisma.file.findUniqueOrThrow.mockResolvedValue({
            ...storedFile,
            variants: [{ id: 1, variant: 'original', storagePath: 'uploads/uuid/original' }],
         });

         await service.removePermanently(7);

         expect(storage.deleteFolder).toHaveBeenCalledWith('uploads/uuid');
         expect(storage.delete).not.toHaveBeenCalled();
      });

      it('answers 404 for a file that is not in the trash', async () => {
         prisma.$queryRaw.mockResolvedValue([]);

         await expect(service.removePermanently(7)).rejects.toBeInstanceOf(NotFoundException);
         expect(prisma.file.deleteMany).not.toHaveBeenCalled();
         expect(storage.delete).not.toHaveBeenCalled();
      });

      it('does not delete a file that a concurrent restore brought back, nor its storage', async () => {
         prisma.file.deleteMany.mockResolvedValue({ count: 0 });

         await expect(service.removePermanently(7)).rejects.toBeInstanceOf(NotFoundException);

         expect(storage.delete).not.toHaveBeenCalled();
         expect(storage.deleteFolder).not.toHaveBeenCalled();
      });

      it('answers 409 when a project (live or trashed) has the file as thumbnail', async () => {
         prisma.project.count.mockResolvedValue(1);

         await expect(service.removePermanently(7)).rejects.toBeInstanceOf(ConflictException);

         expect(prisma.project.count).toHaveBeenCalledWith({ where: { thumbnailId: 7 } });
         expect(prisma.file.deleteMany).not.toHaveBeenCalled();
         expect(storage.delete).not.toHaveBeenCalled();
      });

      it('answers 409 when a project has the file as media', async () => {
         prisma.projectMedia.count.mockResolvedValue(2);

         await expect(service.removePermanently(7)).rejects.toBeInstanceOf(ConflictException);

         expect(prisma.file.deleteMany).not.toHaveBeenCalled();
      });

      it('rethrows other database errors without touching storage', async () => {
         prisma.file.deleteMany.mockRejectedValue(new Error('connection lost'));

         await expect(service.removePermanently(7)).rejects.toThrow('connection lost');

         expect(storage.delete).not.toHaveBeenCalled();
      });

      it('still succeeds when storage cleanup fails afterwards', async () => {
         storage.delete.mockRejectedValue(new Error('r2 down'));

         await expect(service.removePermanently(7)).resolves.toEqual(
            expect.objectContaining({ title: 'cat.png' }),
         );
      });
   });
});
