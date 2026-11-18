import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import { EntityStatus, Language } from '@/generated/prisma/enums';

import type { SaveServiceDto } from '../dto/save-service.dto';
import { ServiceService, titledTranslations } from '../service.service';

const dto = (overrides: Partial<SaveServiceDto> = {}): SaveServiceDto => ({
   slug: 'web',
   showOnHomepage: false,
   translations: [{ language: Language.cs, title: 'Web' }],
   projectIds: [],
   ...overrides,
});

const publisher = { userId: 1, canPublish: true };
const editor = { userId: 2, canPublish: false };

describe('titledTranslations', () => {
   it('keeps only the translations with a title', () => {
      const translations = [
         { language: Language.cs, title: 'Web' },
         { language: Language.en, title: '   ' },
      ];
      expect(titledTranslations(translations)).toEqual([translations[0]]);
   });

   it('refuses a state without any title', () => {
      expect(() => titledTranslations([{ language: Language.cs, title: '' }])).toThrow(
         BadRequestException,
      );
   });
});

describe('ServiceService save', () => {
   let tx: {
      $executeRaw: jest.Mock;
      $queryRaw: jest.Mock;
      service: Record<'findFirst' | 'create' | 'update' | 'findUniqueOrThrow', jest.Mock>;
      serviceTranslation: Record<'upsert' | 'findFirst', jest.Mock>;
      project: { count: jest.Mock };
      serviceProject: Record<'deleteMany' | 'createMany', jest.Mock>;
      slugRedirect: Record<'deleteMany' | 'upsert', jest.Mock>;
   };
   let transaction: jest.Mock;
   let delPattern: jest.Mock;
   let revalidate: jest.Mock;
   let service: ServiceService;

   beforeEach(() => {
      tx = {
         $executeRaw: jest.fn(),
         $queryRaw: jest.fn(),
         service: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 7 }),
            update: jest.fn(),
            findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 7 }),
         },
         serviceTranslation: {
            upsert: jest.fn(),
            findFirst: jest.fn().mockResolvedValue({ title: 'Web' }),
         },
         project: { count: jest.fn() },
         serviceProject: { deleteMany: jest.fn(), createMany: jest.fn() },
         slugRedirect: { deleteMany: jest.fn(), upsert: jest.fn() },
      };
      transaction = jest.fn((callback: (client: typeof tx) => unknown) => callback(tx));
      delPattern = jest.fn();
      revalidate = jest.fn();
      service = new ServiceService(
         { $transaction: transaction } as never,
         { delPattern } as never,
         {} as never,
         { revalidate } as never,
         { publish: jest.fn() } as never,
         { get: jest.fn((_key: string, fallback: unknown) => fallback) } as never,
         {} as never,
      );
   });

   describe('saveNew', () => {
      it('refreshes the cache and the web once, after the commit', async () => {
         tx.$queryRaw.mockResolvedValue([{ next: 0 }]);

         await service.saveNew(dto(), publisher);

         expect(delPattern).toHaveBeenCalledTimes(1);
         expect(revalidate).toHaveBeenCalledTimes(1);
         expect(revalidate).toHaveBeenCalledWith('services');
      });

      it('refuses to publish without the publish permission before touching the database', async () => {
         await expect(
            service.saveNew(dto({ status: EntityStatus.published }), editor),
         ).rejects.toThrow(ForbiddenException);
         expect(transaction).not.toHaveBeenCalled();
      });

      it('answers a taken slug with 409 and refreshes nothing', async () => {
         tx.$queryRaw.mockResolvedValue([{ next: 0 }]);
         tx.service.findFirst.mockResolvedValue({ id: 1 });

         await expect(service.saveNew(dto(), publisher)).rejects.toThrow(ConflictException);
         expect(tx.service.create).not.toHaveBeenCalled();
         expect(revalidate).not.toHaveBeenCalled();
      });
   });

   describe('save', () => {
      it('answers 404 for an unknown service', async () => {
         tx.$queryRaw.mockResolvedValue([]);

         await expect(service.save(9, dto(), publisher)).rejects.toThrow('Service not found');
         expect(tx.service.update).not.toHaveBeenCalled();
      });

      it('refuses a status change without the publish permission', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.draft }]);

         await expect(
            service.save(7, dto({ status: EntityStatus.published }), editor),
         ).rejects.toThrow(ForbiddenException);
         expect(tx.service.update).not.toHaveBeenCalled();
      });

      it('lets a role without the publish permission save a draft with its status', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.draft }]);

         await expect(
            service.save(7, dto({ status: EntityStatus.draft }), editor),
         ).resolves.toBeDefined();
      });

      it('refuses a save of a published service without the publish permission', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.published }]);

         await expect(
            service.save(7, dto({ status: EntityStatus.published }), editor),
         ).rejects.toThrow('Changing published content requires the publish permission');
         await expect(service.save(7, dto(), editor)).rejects.toThrow(ForbiddenException);
         expect(tx.service.update).not.toHaveBeenCalled();
      });

      it('lets a role with the publish permission save a published service', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.published }]);

         await expect(
            service.save(7, dto({ status: EntityStatus.published }), publisher),
         ).resolves.toBeDefined();
      });

      it('answers a slug taken by a concurrent write with 409', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.draft }]);
         tx.service.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
               code: 'P2002',
               clientVersion: 'test',
               meta: { target: ['slug'] },
            }),
         );

         const error = await service.save(7, dto(), publisher).catch((e: unknown) => e);
         expect(error).toBeInstanceOf(ConflictException);
         expect((error as ConflictException).message).toBe('Service with this slug already exists');
         expect(revalidate).not.toHaveBeenCalled();
      });

      it('refreshes the cache and the web once', async () => {
         tx.$queryRaw.mockResolvedValue([{ status: EntityStatus.draft }]);

         await service.save(
            7,
            dto({
               translations: [
                  { language: Language.cs, title: 'Web' },
                  { language: Language.en, title: 'Web' },
               ],
            }),
            publisher,
         );

         expect(tx.serviceTranslation.upsert).toHaveBeenCalledTimes(2);
         expect(delPattern).toHaveBeenCalledTimes(1);
         expect(revalidate).toHaveBeenCalledTimes(1);
      });
   });
});
