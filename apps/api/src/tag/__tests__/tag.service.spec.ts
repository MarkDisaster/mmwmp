import { ConflictException } from '@nestjs/common';

import type { CacheService } from '@/cache/cache.service';
import { Prisma } from '@/generated/prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';

import { TagService } from '../tag.service';

describe('TagService project cache invalidation', () => {
   let prisma: {
      tag: Record<
         | 'findUnique'
         | 'findUniqueOrThrow'
         | 'findFirst'
         | 'findMany'
         | 'create'
         | 'update'
         | 'delete'
         | 'count',
         jest.Mock
      >;
      $transaction: jest.Mock;
   };
   let tagTranslation: { upsert: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
   let queryRaw: jest.Mock;
   let revalidation: { revalidate: jest.Mock };
   let cache: { delPattern: jest.Mock };
   let service: TagService;

   beforeEach(() => {
      tagTranslation = { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() };
      prisma = {
         tag: {
            findUnique: jest.fn().mockResolvedValue({ id: 1 }),
            findUniqueOrThrow: jest.fn().mockResolvedValue({ slug: 'tag' }),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue({ id: 2 }),
            update: jest.fn().mockResolvedValue({ id: 1 }),
            delete: jest.fn().mockResolvedValue({ id: 1 }),
         },
         $transaction: jest.fn((callback: (client: unknown) => unknown) =>
            callback({
               tag: prisma.tag,
               tagTranslation,
               $executeRaw: jest.fn(),
               $queryRaw: queryRaw,
            }),
         ),
      };
      queryRaw = jest.fn().mockResolvedValue([{ next: 0 }]);
      revalidation = { revalidate: jest.fn() };
      cache = { delPattern: jest.fn().mockResolvedValue(undefined) };
      service = new TagService(
         prisma as unknown as PrismaService,
         revalidation as unknown as RevalidationService,
         { publish: jest.fn() } as never,
         cache as unknown as CacheService,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
      );
   });

   const projectsRevalidated = () =>
      revalidation.revalidate.mock.calls.some(([tag]) => tag === 'projects');

   const expectWebRevalidationWaitsForCacheDeletion = async (mutation: () => Promise<unknown>) => {
      let finishDeletion!: () => void;
      cache.delPattern.mockReturnValue(
         new Promise<void>((resolve) => {
            finishDeletion = resolve;
         }),
      );

      const pending = mutation();
      await new Promise((resolve) => setImmediate(resolve));

      expect(cache.delPattern).toHaveBeenCalledWith('projects:*');
      expect(projectsRevalidated()).toBe(false);

      finishDeletion();
      await pending;

      expect(projectsRevalidated()).toBe(true);
   };

   it('revalidates the web only after the cached project responses are cleared on update', async () => {
      await expectWebRevalidationWaitsForCacheDeletion(() =>
         service.update(1, { slug: 'renamed' }),
      );
   });

   describe('expected name (AI tile)', () => {
      const named = (name: string) => ({ translations: [{ language: 'cs', name }] });

      it('writes nothing when the tag is named otherwise than the tile said', async () => {
         prisma.tag.findUnique.mockResolvedValue(named('Studie'));

         await expect(
            service.update(1, { color: '#fff' }, { expectedName: 'Old name' }),
         ).rejects.toThrow('The tag is now named "Studie", not "Old name"');
         await expect(service.trash(1, 1, 'Old name')).rejects.toThrow('now named "Studie"');
         expect(prisma.tag.update).not.toHaveBeenCalled();
      });

      it('goes on when the name matches', async () => {
         prisma.tag.findUnique.mockResolvedValue(named('Studie'));
         tagTranslation.findMany.mockResolvedValue([{ language: 'cs', name: 'Studie' }]);

         await service.update(1, { color: '#fff' }, { expectedName: 'Studie' });
         await service.trash(1, 1, 'Studie');

         expect(prisma.tag.update).toHaveBeenCalledTimes(2);
      });
   });

   describe('a page sorted by name', () => {
      it('keeps the filter of the caller when it reads the rows of the page', async () => {
         const cs = (name: string) => [{ name }];
         prisma.tag.findMany
            .mockResolvedValueOnce([
               { id: 2, translations: cs('B') },
               { id: 1, translations: cs('A') },
            ])
            .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
         prisma.tag.count.mockResolvedValue(2);

         const result = await service.findAll({ sortBy: 'name', page: 0 } as never);

         const pageWhere = prisma.tag.findMany.mock.calls[1]?.[0].where;
         expect(pageWhere).toEqual({
            AND: [expect.objectContaining({ deletedAt: null }), { id: { in: [1, 2] } }],
         });
         expect(result.data.map((tag: { id: number }) => tag.id)).toEqual([1, 2]);
         expect(result.totalCount).toBe(2);
      });
   });

   it('revalidates the web only after the cached project responses are cleared on trash', async () => {
      await expectWebRevalidationWaitsForCacheDeletion(() => service.trash(1, 1));
   });

   it('does not touch the project cache when a tag is only created', async () => {
      prisma.tag.findUnique.mockResolvedValue(null);

      await service.create({ slug: 'new', translations: [{ language: 'cs', name: 'Nový' }] });

      expect(cache.delPattern).not.toHaveBeenCalled();
   });

   it('puts a new tag at the end of the manual order', async () => {
      prisma.tag.findUnique.mockResolvedValue(null);
      queryRaw.mockResolvedValue([{ next: 5 }]);

      await service.create({ slug: 'new', translations: [{ language: 'cs', name: 'Nový' }] });

      expect(prisma.tag.create).toHaveBeenCalledWith(
         expect.objectContaining({
            data: {
               slug: 'new',
               color: undefined,
               sortOrder: 5,
               translations: { create: [{ language: 'cs', name: 'Nový' }] },
            },
         }),
      );
   });

   it('rejects a new tag without a Czech name', async () => {
      await expect(
         service.create({ slug: 'new', translations: [{ language: 'en', name: 'New' }] }),
      ).rejects.toThrow('The Czech (cs) name of the tag is required');
      expect(prisma.tag.create).not.toHaveBeenCalled();
   });

   describe('slug format', () => {
      const dto = { slug: 'Bad Slug', translations: [{ language: 'cs' as const, name: 'Web' }] };

      it('rejects a new tag with a slug outside the rule, for every caller', async () => {
         await expect(service.create(dto)).rejects.toThrow('Slug must be lowercase');
         expect(prisma.tag.create).not.toHaveBeenCalled();
      });

      it('rejects a changed slug outside the rule on update', async () => {
         queryRaw.mockResolvedValue([{ slug: 'web' }]);
         await expect(service.update(1, { slug: 'a--b' })).rejects.toThrow(
            'Slug must be lowercase',
         );
         expect(prisma.tag.update).not.toHaveBeenCalled();
      });

      it('saves a tag whose old slug is outside the rule when the slug is sent back unchanged', async () => {
         queryRaw.mockResolvedValue([{ slug: 'Old Slug' }]);
         await expect(service.update(1, { slug: 'Old Slug' })).resolves.toBeDefined();
      });
   });

   describe('a slug taken by an overlapping write (P2002)', () => {
      const slugTaken = () =>
         new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: ['slug'] },
         });

      const expectSlugConflict = async (write: () => Promise<unknown>) => {
         const error = await write().catch((e: unknown) => e);
         expect(error).toBeInstanceOf(ConflictException);
         expect((error as ConflictException).message).toBe('Tag with this slug already exists');
         expect(revalidation.revalidate).not.toHaveBeenCalled();
      };

      it('answers 409 on create', async () => {
         prisma.tag.findUnique.mockResolvedValue(null);
         prisma.tag.create.mockRejectedValue(slugTaken());

         await expectSlugConflict(() =>
            service.create({ slug: 'web', translations: [{ language: 'cs', name: 'Web' }] }),
         );
      });

      it('answers 409 on update', async () => {
         prisma.tag.update.mockRejectedValue(slugTaken());

         await expectSlugConflict(() => service.update(1, { slug: 'web' }));
      });

      it('answers 409 on trash', async () => {
         prisma.tag.update.mockRejectedValue(slugTaken());

         await expectSlugConflict(() => service.trash(1, 1));
      });
   });

   describe('update translations', () => {
      it('replaces the names with the sent set: upserts the sent ones, removes the others', async () => {
         await service.update(1, {
            translations: [{ language: 'cs', name: ' Případová studie ' }],
         });

         expect(tagTranslation.upsert).toHaveBeenCalledTimes(1);
         expect(tagTranslation.upsert).toHaveBeenCalledWith({
            where: { tagId_language: { tagId: 1, language: 'cs' } },
            create: { tagId: 1, language: 'cs', name: 'Případová studie' },
            update: { name: 'Případová studie' },
         });
         expect(tagTranslation.deleteMany).toHaveBeenCalledWith({
            where: { tagId: 1, language: { notIn: ['cs'] } },
         });
      });

      it('merges a patch into the names read inside the transaction (under the row lock)', async () => {
         const order: string[] = [];
         tagTranslation.findMany.mockImplementation(async () => {
            order.push('read');
            return [
               { language: 'cs', name: 'Studie' },
               { language: 'en', name: 'Study' },
            ];
         });
         prisma.$transaction.mockImplementationOnce((callback: (client: unknown) => unknown) => {
            order.push('transaction');
            return callback({
               tag: prisma.tag,
               tagTranslation,
               $executeRaw: jest.fn(),
               $queryRaw: queryRaw,
            });
         });

         await service.update(
            1,
            { translations: [{ language: 'cs', name: 'Studie 2' }] },
            { removeLanguages: ['en'] },
         );

         expect(order).toEqual(['transaction', 'read']);
         expect(tagTranslation.upsert).toHaveBeenCalledTimes(1);
         expect(tagTranslation.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ update: { name: 'Studie 2' } }),
         );
         expect(tagTranslation.deleteMany).toHaveBeenCalledWith({
            where: { tagId: 1, language: { notIn: ['cs'] } },
         });
      });

      it('rejects a patch that sets and removes the same language', async () => {
         tagTranslation.findMany.mockResolvedValue([{ language: 'cs', name: 'Studie' }]);

         await expect(
            service.update(
               1,
               { translations: [{ language: 'en', name: 'Study' }] },
               { removeLanguages: ['en'] },
            ),
         ).rejects.toThrow('both set and removed');
      });

      it('leaves the names alone when no translations are sent', async () => {
         await service.update(1, { color: '#fff' });

         expect(tagTranslation.upsert).not.toHaveBeenCalled();
         expect(tagTranslation.deleteMany).not.toHaveBeenCalled();
      });

      it('drops an English name sent empty and rejects a set without Czech', async () => {
         await service.update(1, {
            translations: [
               { language: 'cs', name: 'Studie' },
               { language: 'en', name: '  ' },
            ],
         });
         expect(tagTranslation.deleteMany).toHaveBeenCalledWith({
            where: { tagId: 1, language: { notIn: ['cs'] } },
         });

         await expect(
            service.update(1, { translations: [{ language: 'en', name: 'Study' }] }),
         ).rejects.toThrow('The Czech (cs) name of the tag is required');
      });
   });

   describe('move', () => {
      beforeEach(() => {
         queryRaw.mockResolvedValue([
            { id: 1, sortOrder: 0 },
            { id: 2, sortOrder: 1 },
         ]);
      });

      it('revalidates the web only after the cached project responses are cleared', async () => {
         await expectWebRevalidationWaitsForCacheDeletion(() =>
            service.move(1, { targetId: 2, position: 'after' }),
         );
         expect(revalidation.revalidate).toHaveBeenCalledWith('tags');
      });

      it('keeps the caches when the tag already is where it should go', async () => {
         await service.move(2, { targetId: 1, position: 'after' });

         expect(cache.delPattern).not.toHaveBeenCalled();
         expect(revalidation.revalidate).not.toHaveBeenCalled();
      });
   });
});
