import { ConflictException, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../prisma/generated/prisma/client';
import { ApiErrorCode } from '../../../src/common/enum/api-error-code.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';
import {
   BUSY_MESSAGE,
   CONCURRENT_CHANGE_MESSAGE,
   describeDatabaseError,
   type SaveErrorMessages,
   toSaveHttpError,
} from '../../../src/prisma/save-error.helper';
import { getApp } from '../../setup/init';
import { holdRowLock } from '../../setup/locks';
import { names } from '../../setup/tags';

const MESSAGES: SaveErrorMessages = {
   uniqueTaken: { field: 'slug', message: 'slug taken', code: ApiErrorCode.SLUG_TAKEN },
   referenceMissing: 'reference missing',
};

describe('Save error mapping against the real database (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.projectTag.deleteMany();
      await prisma.project.deleteMany();
      await prisma.tag.deleteMany();
   };
   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const caught = async (operation: () => Promise<unknown>) => {
      try {
         await operation();
      } catch (error) {
         return error;
      }
      throw new Error('The operation did not fail');
   };

   it('reads the columns of a unique violation from the driver adapter error, not meta.target', async () => {
      await prisma.project.create({ data: { slug: 'taken' } });

      const error = await caught(() => prisma.project.create({ data: { slug: 'taken' } }));

      expect(describeDatabaseError(error)).toEqual({ sqlState: '23505', fields: ['slug'] });
      const mapped = toSaveHttpError(error, MESSAGES);
      expect(mapped).toBeInstanceOf(ConflictException);
      expect((mapped as ConflictException).message).toBe('slug taken');
   });

   it('answers another unique violation (a tag assigned twice) with the generic 409', async () => {
      const project = await prisma.project.create({ data: { slug: 'p' } });
      const tag = await prisma.tag.create({ data: { translations: names('t'), slug: 't' } });
      await prisma.projectTag.create({ data: { projectId: project.id, tagId: tag.id } });

      const error = await caught(() =>
         prisma.projectTag.create({ data: { projectId: project.id, tagId: tag.id } }),
      );

      expect(describeDatabaseError(error)).toEqual({
         sqlState: '23505',
         fields: ['project_id', 'tag_id'],
      });
      expect((toSaveHttpError(error, MESSAGES) as ConflictException).message).toBe(
         CONCURRENT_CHANGE_MESSAGE,
      );
   });

   it('answers a foreign key violation (a deleted tag) with the 404 of the save', async () => {
      const project = await prisma.project.create({ data: { slug: 'p' } });

      const error = await caught(() =>
         prisma.projectTag.createMany({ data: [{ projectId: project.id, tagId: 999999 }] }),
      );

      expect(describeDatabaseError(error)?.sqlState).toBe('23503');
      const mapped = toSaveHttpError(error, MESSAGES);
      expect(mapped).toBeInstanceOf(NotFoundException);
      expect((mapped as NotFoundException).message).toBe('reference missing');
   });

   it('answers a lock timeout inside a transaction with the 409 try-again', async () => {
      const project = await prisma.project.create({ data: { slug: 'p' } });
      const lock = await holdRowLock('projects', project.id);

      let error: unknown;
      try {
         error = await caught(() =>
            prisma.$transaction(async (tx) => {
               await tx.$executeRaw`SELECT set_config('lock_timeout', '100ms', true)`;
               await tx.project.update({ where: { id: project.id }, data: { company: 'x' } });
            }),
         );
      } finally {
         await lock.release();
      }

      expect(describeDatabaseError(error)?.sqlState).toBe('55P03');
      expect((toSaveHttpError(error, MESSAGES) as ConflictException).message).toBe(BUSY_MESSAGE);
   });

   it('answers a transaction that ran out of time (P2028) with 409 try again', async () => {
      const error = await caught(() =>
         prisma.$transaction(
            async (tx) => {
               await new Promise((resolve) => setTimeout(resolve, 300));
               await tx.project.count();
            },
            { timeout: 50 },
         ),
      );

      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2028');
      const mapped = toSaveHttpError(error, MESSAGES) as ConflictException;
      expect(mapped).toBeInstanceOf(ConflictException);
      expect(mapped.message).toBe(BUSY_MESSAGE);
      expect(mapped.cause).toBe(error);
   });

   it('leaves an error that is not a database error unchanged', () => {
      const error = new Error('boom');
      expect(toSaveHttpError(error, MESSAGES)).toBe(error);
   });
});
