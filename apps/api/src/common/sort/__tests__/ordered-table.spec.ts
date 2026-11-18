import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';

import { createAtEnd, moveInTable, planMove, writeSortOrders } from '../ordered-table';

const rowsOf = (...ids: number[]) => ids.map((id, sortOrder) => ({ id, sortOrder }));
const toPairs = (rows: { id: number; sortOrder: number }[]) =>
   rows.map(({ id, sortOrder }) => [id, sortOrder]);

describe('planMove', () => {
   it('moves a row down after the target and shifts only the rows in between', () => {
      expect(toPairs(planMove(rowsOf(1, 2, 3, 4), 1, 3, 'after', 'Service'))).toEqual([
         [2, 0],
         [3, 1],
         [1, 2],
      ]);
   });

   it('moves a row up before the target', () => {
      expect(toPairs(planMove(rowsOf(1, 2, 3, 4), 4, 2, 'before', 'Service'))).toEqual([
         [4, 1],
         [2, 2],
         [3, 3],
      ]);
   });

   it('can make a row the first and the last one', () => {
      expect(toPairs(planMove(rowsOf(1, 2, 3, 4), 3, 1, 'before', 'Service'))).toEqual([
         [3, 0],
         [1, 1],
         [2, 2],
      ]);
      expect(toPairs(planMove(rowsOf(1, 2, 3, 4), 1, 4, 'after', 'Service'))).toEqual([
         [2, 0],
         [3, 1],
         [4, 2],
         [1, 3],
      ]);
   });

   it('changes nothing when the row already is where it should go', () => {
      expect(planMove(rowsOf(1, 2, 3), 2, 1, 'after', 'Service')).toEqual([]);
   });

   it('repairs ties and gaps in older data', () => {
      const rows = [
         { id: 1, sortOrder: 0 },
         { id: 2, sortOrder: 0 },
         { id: 3, sortOrder: 7 },
      ];

      expect(toPairs(planMove(rows, 3, 1, 'before', 'Service'))).toEqual([
         [3, 0],
         [1, 1],
         [2, 2],
      ]);
   });

   it('names the entity in the errors', () => {
      expect(() => planMove(rowsOf(1, 2), 9, 1, 'after', 'Project')).toThrow(
         new NotFoundException('Project not found'),
      );
      expect(() => planMove(rowsOf(1, 2), 1, 9, 'after', 'Project')).toThrow(
         new BadRequestException('Project 9 does not exist'),
      );
   });
});

describe('moveInTable', () => {
   let executeRaw: jest.Mock;
   let queryRaw: jest.Mock;
   let transaction: jest.Mock;
   let prisma: PrismaService;

   beforeEach(() => {
      executeRaw = jest.fn();
      queryRaw = jest.fn().mockResolvedValue(rowsOf(1, 2, 3));
      const tx = { $executeRaw: executeRaw, $queryRaw: queryRaw };
      transaction = jest.fn(
         (callback: (client: typeof tx) => unknown, _options?: { timeout: number }) => callback(tx),
      );
      prisma = { $transaction: transaction } as unknown as PrismaService;
   });

   const update = () => executeRaw.mock.calls[1]?.[0] as Prisma.Sql | undefined;
   const move = (table: 'services' | 'projects', id: number, targetId: number) =>
      moveInTable(prisma, { table, id, targetId, position: 'after', canPublish: true });

   it('takes the lock before it reads the order', async () => {
      await move('services', 1, 2);

      expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
         queryRaw.mock.invocationCallOrder[0],
      );
   });

   it('writes the moved rows in one statement and returns how many moved', async () => {
      const { moved } = await move('projects', 1, 3);

      expect(moved).toBe(3);
      expect(executeRaw).toHaveBeenCalledTimes(2);
      expect(update()?.values).toEqual([2, 0, 3, 1, 1, 2]);
      expect(update()?.sql).toContain('UPDATE projects');
   });

   it('stores updated_at of the moved rows in UTC, as Prisma does', async () => {
      await move('services', 1, 3);

      expect(update()?.sql).toContain("updated_at = NOW() AT TIME ZONE 'UTC'");
   });

   it('waits for the lock of an overlapping move longer than Prisma allows by default', async () => {
      await move('services', 1, 3);

      expect(transaction.mock.calls[0][1]?.timeout).toBeGreaterThan(5_000);
   });

   it('writes nothing when the order does not change', async () => {
      const { moved } = await move('services', 2, 1);

      expect(moved).toBe(0);
      expect(executeRaw).toHaveBeenCalledTimes(1);
   });

   describe('without the publish permission', () => {
      const moveAsEditor = (id: number, targetId: number) =>
         moveInTable(prisma, {
            table: 'projects',
            id,
            targetId,
            position: 'after',
            canPublish: false,
         });

      it('moves a draft, reading its status under the row lock', async () => {
         queryRaw
            .mockResolvedValueOnce([{ status: 'draft' }])
            .mockResolvedValueOnce(rowsOf(1, 2, 3));

         await expect(moveAsEditor(1, 3)).resolves.toMatchObject({ moved: 3 });
         const statusQuery = queryRaw.mock.calls[0][0] as Prisma.Sql;
         expect(statusQuery.sql).toContain('FOR NO KEY UPDATE');
         expect(statusQuery.values).toEqual([1]);
      });

      it('refuses to move a published row and writes nothing', async () => {
         queryRaw.mockResolvedValueOnce([{ status: 'published' }]);

         await expect(moveAsEditor(1, 3)).rejects.toThrow(
            'Changing published content requires the publish permission',
         );
         expect(executeRaw).toHaveBeenCalledTimes(1);
      });

      it('answers 404 for a row that does not exist', async () => {
         queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce(rowsOf(1, 2, 3));

         await expect(moveAsEditor(9, 1)).rejects.toThrow('Project not found');
      });
   });

   it('rejects a row next to itself before it opens a transaction', async () => {
      await expect(move('services', 1, 1)).rejects.toThrow(
         new BadRequestException('A service cannot be placed next to itself'),
      );
      expect(transaction).not.toHaveBeenCalled();
   });

   it('names the entity of the table in the errors', async () => {
      await expect(move('projects', 9, 1)).rejects.toThrow(
         new NotFoundException('Project not found'),
      );
   });
});

describe('createAtEnd', () => {
   it('creates the row under the lock, at the end of the order, with a patient timeout', async () => {
      const executeRaw = jest.fn();
      const queryRaw = jest.fn().mockResolvedValue([{ next: 5 }]);
      const tx = { $executeRaw: executeRaw, $queryRaw: queryRaw };
      const transaction = jest.fn(
         (callback: (client: typeof tx) => unknown, _options?: { timeout: number }) => callback(tx),
      );
      const create = jest.fn().mockResolvedValue({ id: 9 });

      const result = await createAtEnd(
         { $transaction: transaction } as unknown as PrismaService,
         'projects',
         create,
      );

      expect(result).toEqual({ id: 9 });
      expect(create).toHaveBeenCalledWith(tx, 5);
      expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
         queryRaw.mock.invocationCallOrder[0],
      );
      expect(transaction.mock.calls[0][1]?.timeout).toBeGreaterThan(5_000);
   });
});

describe('writeSortOrders', () => {
   const run = async (
      table: 'project_media' | 'tags',
      rows: { id: number; sortOrder: number }[],
   ) => {
      const executeRaw = jest.fn();
      await writeSortOrders({ $executeRaw: executeRaw } as never, table, rows);
      return executeRaw;
   };

   it('writes every listed row in one statement', async () => {
      const executeRaw = await run('tags', [
         { id: 4, sortOrder: 0 },
         { id: 2, sortOrder: 1 },
      ]);

      expect(executeRaw).toHaveBeenCalledTimes(1);
      const sql = executeRaw.mock.calls[0][0] as Prisma.Sql;
      expect(sql.values).toEqual([4, 0, 2, 1]);
      expect(sql.sql).toContain("updated_at = NOW() AT TIME ZONE 'UTC'");
   });

   it('does not touch updated_at of a table without it (the media of a project)', async () => {
      const executeRaw = await run('project_media', [{ id: 1, sortOrder: 0 }]);

      const sql = executeRaw.mock.calls[0][0] as Prisma.Sql;
      expect(sql.sql).toContain('UPDATE project_media');
      expect(sql.sql).not.toContain('updated_at');
   });

   it('sends no statement for an empty list', async () => {
      expect(await run('tags', [])).not.toHaveBeenCalled();
   });
});

describe('a write of the order that cannot get a connection in time (P2028)', () => {
   const busy = new Prisma.PrismaClientKnownRequestError('Transaction API error', {
      code: 'P2028',
      clientVersion: 'test',
   });
   const prisma = { $transaction: jest.fn().mockRejectedValue(busy) } as unknown as PrismaService;

   beforeEach(() => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
   });
   afterEach(() => jest.restoreAllMocks());

   it('answers a create with 409 instead of 500', async () => {
      await expect(createAtEnd(prisma, 'tags', jest.fn())).rejects.toBeInstanceOf(
         ConflictException,
      );
   });

   it('answers a move with 409 instead of 500', async () => {
      await expect(
         moveInTable(prisma, { table: 'tags', id: 1, targetId: 2, position: 'after' }),
      ).rejects.toBeInstanceOf(ConflictException);
   });

   it('passes other errors on unchanged', async () => {
      const other = new Error('connection lost');
      const failing = { $transaction: jest.fn().mockRejectedValue(other) };
      await expect(
         createAtEnd(failing as unknown as PrismaService, 'tags', jest.fn()),
      ).rejects.toBe(other);
   });
});
