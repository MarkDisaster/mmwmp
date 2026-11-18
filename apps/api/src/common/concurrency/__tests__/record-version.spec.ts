import { ConflictException, NotFoundException } from '@nestjs/common';

import type { Prisma } from '@/generated/prisma/client';

import { incrementVersion } from '../record-version';

const transaction = (rows: { version: number }[]) => {
   const queryRaw = jest.fn().mockResolvedValue(rows);
   return { tx: { $queryRaw: queryRaw } as unknown as Prisma.TransactionClient, queryRaw };
};

const sqlOf = (queryRaw: jest.Mock) => (queryRaw.mock.calls[0][0] as Prisma.Sql).sql;

describe('incrementVersion', () => {
   it('returns the raised version when the expected one is stored', async () => {
      const { tx } = transaction([{ version: 4 }]);

      await expect(
         incrementVersion(tx, { table: 'projects', id: 7, expectedVersion: 3 }),
      ).resolves.toBe(4);
   });

   it('raises without a check when no version is expected', async () => {
      const { tx } = transaction([{ version: 9 }]);

      await expect(incrementVersion(tx, { table: 'tags', id: 7 })).resolves.toBe(9);
   });

   it('answers 409 VERSION_CONFLICT with the stored version for another one', async () => {
      const { tx } = transaction([{ version: 6 }]);

      const error = await incrementVersion(tx, {
         table: 'services',
         id: 7,
         expectedVersion: 3,
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
         statusCode: 409,
         message: expect.any(String),
         error: 'Conflict',
         code: 'VERSION_CONFLICT',
         currentVersion: 5,
      });
   });

   it('answers 404 with the noun of the table when the row does not exist', async () => {
      const { tx } = transaction([]);

      await expect(
         incrementVersion(tx, { table: 'files', id: 7, expectedVersion: 0 }),
      ).rejects.toThrow(new NotFoundException('File not found'));
   });

   it('filters the trash state only when asked to and only on a table with a trash', async () => {
      const live = transaction([{ version: 1 }]);
      const trashed = transaction([{ version: 1 }]);
      const any = transaction([{ version: 1 }]);
      const contact = transaction([{ version: 1 }]);

      await incrementVersion(live.tx, { table: 'projects', id: 7, state: 'live' });
      await incrementVersion(trashed.tx, { table: 'files', id: 7, state: 'trashed' });
      await incrementVersion(any.tx, { table: 'projects', id: 7 });
      await incrementVersion(contact.tx, { table: 'contacts', id: 7, state: 'live' });

      expect(sqlOf(live.queryRaw)).toContain('deleted_at IS NULL');
      expect(sqlOf(trashed.queryRaw)).toContain('deleted_at IS NOT NULL');
      expect(sqlOf(any.queryRaw)).not.toContain('deleted_at');
      expect(sqlOf(contact.queryRaw)).not.toContain('deleted_at');
      expect(sqlOf(live.queryRaw)).toMatch(/^UPDATE projects SET version = version \+ 1 WHERE/);
   });
});
