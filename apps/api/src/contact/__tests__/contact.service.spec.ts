import type { CacheService } from '@/cache/cache.service';
import { Language } from '@/generated/prisma/enums';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RevalidationService } from '@/revalidation/revalidation.service';

import { ContactService } from '../contact.service';

describe('ContactService translations', () => {
   let upsertTranslation: jest.Mock;
   let revalidation: { revalidate: jest.Mock };
   let cache: { del: jest.Mock };
   let service: ContactService;

   beforeEach(() => {
      upsertTranslation = jest.fn().mockResolvedValue({});
      const tx = {
         contact: {
            findFirst: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn().mockResolvedValue({ id: 1 }),
            create: jest.fn(),
            findUnique: jest.fn().mockResolvedValue({ id: 1, translations: [] }),
         },
         contactTranslation: { upsert: upsertTranslation },
         $queryRaw: jest.fn().mockResolvedValue([{ version: 1 }]),
      };
      const prisma = { $transaction: jest.fn((cb: (client: unknown) => unknown) => cb(tx)) };
      revalidation = { revalidate: jest.fn() };
      cache = { del: jest.fn().mockResolvedValue(undefined) };
      service = new ContactService(
         prisma as unknown as PrismaService,
         cache as unknown as CacheService,
         revalidation as unknown as RevalidationService,
         { publish: jest.fn() } as never,
      );
   });

   const upsertArgs = () => upsertTranslation.mock.calls[0][0];

   it('should save the heading as plain text, trimmed and without HTML', async () => {
      await service.upsert({
         translations: [{ language: Language.cs, aboutTitle: ' <b>Kdo</b> jsem ' }],
      });

      expect(upsertArgs().create.aboutTitle).toBe('Kdo jsem');
      expect(upsertArgs().update.aboutTitle).toBe('Kdo jsem');
   });

   it.each([null, '', '   '])('should clear the heading for %j', async (value) => {
      await service.upsert({ translations: [{ language: Language.en, aboutTitle: value }] });

      expect(upsertArgs().update.aboutTitle).toBeNull();
   });

   it('should keep the heading when it is omitted and the description is saved', async () => {
      await service.upsert({ translations: [{ language: Language.cs, description: '<p>x</p>' }] });

      expect(upsertArgs().update).toEqual({ description: '<p>x</p>' });
      expect('aboutTitle' in upsertArgs().update).toBe(false);
   });

   it('should keep the description when only the heading is saved', async () => {
      await service.upsert({ translations: [{ language: Language.cs, aboutTitle: 'Kdo jsem' }] });

      expect(upsertArgs().update).toEqual({ aboutTitle: 'Kdo jsem' });
   });

   it('should invalidate the cache and the web tag after saving', async () => {
      await service.upsert({ translations: [{ language: Language.cs, aboutTitle: 'A' }] });

      expect(cache.del).toHaveBeenCalledWith('contact:public');
      expect(revalidation.revalidate).toHaveBeenCalledWith('contact');
   });
});
