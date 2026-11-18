import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { generateText } from 'ai';

import { EntityStatus, Language } from '@/generated/prisma/enums';

import { ProjectService } from '../project.service';

jest.mock('ai', () => ({ ...jest.requireActual('ai'), generateText: jest.fn() }));

const publisher = { userId: 1, canPublish: true };

describe('ProjectService translations', () => {
   let tx: {
      $executeRaw: jest.Mock;
      $queryRaw: jest.Mock;
      project: { update: jest.Mock };
      projectTranslation: Record<'findUnique' | 'findFirst' | 'count' | 'delete', jest.Mock>;
   };
   let delPattern: jest.Mock;
   let findUnique: jest.Mock;
   let hit: jest.Mock;
   let service: ProjectService;

   beforeEach(() => {
      tx = {
         $executeRaw: jest.fn(),
         $queryRaw: jest.fn().mockResolvedValue([{ status: EntityStatus.published, version: 2 }]),
         project: { update: jest.fn() },
         projectTranslation: {
            findUnique: jest.fn().mockResolvedValue({ language: Language.en, title: 'Alpha' }),
            findFirst: jest.fn().mockResolvedValue({ title: 'Alfa' }),
            count: jest.fn().mockResolvedValue(1),
            delete: jest.fn(),
         },
      };
      delPattern = jest.fn();
      findUnique = jest.fn().mockResolvedValue({ id: 7 });
      hit = jest.fn().mockResolvedValue({ allowed: true, count: 1, retryAfterSeconds: 3600 });
      jest.mocked(generateText).mockReset();
      service = new ProjectService(
         {
            $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
            project: { findUnique },
         } as never,
         {} as never,
         {} as never,
         { delPattern } as never,
         {} as never,
         { revalidate: jest.fn() } as never,
         { publish: jest.fn() } as never,
         {} as never,
         { hit } as never,
      );
   });

   describe('deleteTranslation', () => {
      it('deletes a translation while another one with a title stays', async () => {
         await service.deleteTranslation(7, Language.en, publisher);

         expect(tx.projectTranslation.count).toHaveBeenCalledWith({
            where: { projectId: 7, language: { not: Language.en }, title: { not: '' } },
         });
         expect(tx.projectTranslation.delete).toHaveBeenCalledWith({
            where: { projectId_language: { projectId: 7, language: Language.en } },
         });
         expect(tx.project.update).toHaveBeenCalledWith({
            where: { id: 7 },
            data: { title: 'Alfa' },
         });
         expect(delPattern).toHaveBeenCalled();
      });

      it('refuses to delete the last translation with a title', async () => {
         tx.projectTranslation.count.mockResolvedValue(0);

         const error = await service
            .deleteTranslation(7, Language.cs, publisher)
            .catch((e: unknown) => e);

         expect(error).toBeInstanceOf(BadRequestException);
         expect((error as BadRequestException).message).toBe(
            'The last translation with a title cannot be deleted',
         );
         expect(tx.projectTranslation.delete).not.toHaveBeenCalled();
         expect(tx.project.update).not.toHaveBeenCalled();
         expect(delPattern).not.toHaveBeenCalled();
      });

      it('answers 404 for a missing translation before counting the others', async () => {
         tx.projectTranslation.findUnique.mockResolvedValue(null);

         await expect(service.deleteTranslation(7, Language.en, publisher)).rejects.toThrow(
            NotFoundException,
         );
         expect(tx.projectTranslation.count).not.toHaveBeenCalled();
         expect(tx.projectTranslation.delete).not.toHaveBeenCalled();
      });
   });

   describe('generateTranslation', () => {
      const source = { title: 'Alfa', description: null, content: '<p>Text</p>' };

      it('counts the call against the limit of the user before the model runs', async () => {
         hit.mockResolvedValue({ allowed: false, count: 21, retryAfterSeconds: 1800 });

         const error = await service
            .generateTranslation(7, Language.en, source, 5)
            .catch((e: unknown) => e);

         expect(hit).toHaveBeenCalledWith('translation:generate:5', 20, 3600);
         expect(error).toBeInstanceOf(HttpException);
         expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
         expect(generateText).not.toHaveBeenCalled();
      });

      it('refuses a too long source before counting it or running the model', async () => {
         await expect(
            service.generateTranslation(
               7,
               Language.en,
               { ...source, content: 'x'.repeat(100_001) },
               5,
            ),
         ).rejects.toThrow(BadRequestException);
         expect(hit).not.toHaveBeenCalled();
         expect(generateText).not.toHaveBeenCalled();
      });

      it('answers 404 for a missing project without counting the call', async () => {
         findUnique.mockResolvedValue(null);

         await expect(service.generateTranslation(7, Language.en, source, 5)).rejects.toThrow(
            NotFoundException,
         );
         expect(hit).not.toHaveBeenCalled();
      });
   });
});
