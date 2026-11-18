import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Job, Queue } from 'bullmq';

import type { PrismaService } from '@/prisma/prisma.service';

import { CLEANUP_LIMITS, type CleanupLimits } from '../runner-score.rules';
import { RunnerScoreCleanupProcessor } from '../runner-score-cleanup.processor';
import { RunnerScoreCleanupQueue } from '../runner-score-cleanup.queue';
import { RunnerScoreCleanupService } from '../runner-score-cleanup.service';

const config = (enabled: boolean) =>
   ({ get: jest.fn().mockReturnValue(enabled) }) as unknown as ConfigService;

describe('runner score cleanup', () => {
   describe('RunnerScoreCleanupQueue', () => {
      const queue = { upsertJobScheduler: jest.fn(), removeJobScheduler: jest.fn() };

      beforeEach(() => {
         queue.upsertJobScheduler.mockReset().mockResolvedValue({});
         queue.removeJobScheduler.mockReset().mockResolvedValue(true);
      });

      it('upserts one daily scheduler under a fixed id, so every instance shares it', async () => {
         await new RunnerScoreCleanupQueue(
            queue as unknown as Queue,
            config(true),
         ).onApplicationBootstrap();

         expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
            'runner-score-cleanup-daily',
            { pattern: '30 3 * * *', tz: 'UTC' },
            expect.objectContaining({ name: 'cleanup' }),
         );
      });

      it('removes the scheduler when the kill switch is off', async () => {
         await new RunnerScoreCleanupQueue(
            queue as unknown as Queue,
            config(false),
         ).onApplicationBootstrap();

         expect(queue.removeJobScheduler).toHaveBeenCalledWith('runner-score-cleanup-daily');
         expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
      });

      it('logs a failure instead of stopping the API from starting', async () => {
         queue.upsertJobScheduler.mockRejectedValue(new Error('no Redis'));
         const error = jest.spyOn(Logger.prototype, 'error');

         await expect(
            new RunnerScoreCleanupQueue(
               queue as unknown as Queue,
               config(true),
            ).onApplicationBootstrap(),
         ).resolves.toBeUndefined();
         expect(error).toHaveBeenCalledWith(expect.stringContaining('no Redis'));
      });
   });

   describe('RunnerScoreCleanupProcessor', () => {
      const cleanup = { deleteStaleScores: jest.fn() };
      const processor = (enabled: boolean) =>
         new RunnerScoreCleanupProcessor(
            cleanup as unknown as RunnerScoreCleanupService,
            config(enabled),
         );

      beforeEach(() => cleanup.deleteStaleScores.mockReset());

      it('runs the cleanup and returns its result', async () => {
         const result = { deleted: 42, remaining: 1200, stop: 'done' };
         cleanup.deleteStaleScores.mockResolvedValue(result);

         expect(await processor(true).process({ name: 'cleanup', id: '1' } as Job)).toBe(result);
      });

      it('does nothing while the kill switch is off', async () => {
         expect(await processor(false).process({ name: 'cleanup', id: '1' } as Job)).toBeNull();
         expect(cleanup.deleteStaleScores).not.toHaveBeenCalled();
      });

      it('skips a job it does not know', async () => {
         expect(await processor(true).process({ name: 'other', id: '2' } as Job)).toBeNull();
         expect(cleanup.deleteStaleScores).not.toHaveBeenCalled();
      });
   });

   describe('RunnerScoreCleanupService', () => {
      const database = ({ visible, deletable, clockOffMs = 0 }: Record<string, number>) => {
         const state = { visible, deletable, statements: [] as string[] };
         const tx = {
            $executeRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
               const sql = strings.join('?');
               state.statements.push(sql);
               if (!sql.includes('DELETE')) return Promise.resolve(1);
               const limit = values[values.length - 1] as number;
               if (sql.includes('runner_scores AS extra')) {
                  const deleted = Math.min(limit, state.visible);
                  state.visible -= deleted;
                  return Promise.resolve(deleted);
               }
               const deleted = Math.min(limit, state.deletable);
               state.deletable -= deleted;
               state.visible -= deleted;
               return Promise.resolve(deleted);
            }),
            $queryRaw: jest.fn(() => Promise.resolve([{ visible: state.visible }])),
         };
         const prisma = {
            $queryRaw: jest.fn(() =>
               Promise.resolve([{ epoch: (Date.now() + clockOffMs) / 1000 }]),
            ),
            $transaction: jest.fn((run: (t: typeof tx) => Promise<unknown>) => run(tx)),
            runnerScore: { count: jest.fn(() => Promise.resolve(state.visible)) },
         };
         return {
            state,
            tx,
            prisma,
            service: new RunnerScoreCleanupService(prisma as unknown as PrismaService),
         };
      };
      const limits = (change: Partial<CleanupLimits>) => ({ ...CLEANUP_LIMITS, ...change });

      it('deletes in batches until there is nothing left, and reports what remains', async () => {
         const { service, prisma, state } = database({ visible: 3500, deletable: 2500 });
         const log = jest.spyOn(Logger.prototype, 'log');

         expect(await service.deleteStaleScores()).toEqual({
            deleted: 2500,
            remaining: 1000,
            stop: 'done',
         });
         expect(prisma.$transaction).toHaveBeenCalledTimes(3);
         expect(
            state.statements.filter((sql) => sql.includes('pg_advisory_xact_lock')),
         ).toHaveLength(3);
         expect(log).toHaveBeenCalledWith(
            expect.stringContaining('deleted 2500 rows, 1000 visible'),
         );
      });

      it('logs and returns when there is nothing to delete', async () => {
         const { service } = database({ visible: 2000, deletable: 0 });

         await expect(service.deleteStaleScores()).resolves.toEqual({
            deleted: 0,
            remaining: 2000,
            stop: 'done',
         });
      });

      it('never deletes below the floor of visible runs, whatever the delete would match', async () => {
         const { service, state } = database({ visible: 1500, deletable: 1500 });

         const result = await service.deleteStaleScores();

         expect(result).toEqual({ deleted: 501, remaining: 999, stop: 'floor' });
         expect(state.visible).toBe(999);
      });

      it('deletes nothing with fewer visible runs than the floor', async () => {
         const { service, state } = database({ visible: 999, deletable: 999 });

         expect(await service.deleteStaleScores()).toEqual({
            deleted: 0,
            remaining: 999,
            stop: 'floor',
         });
         expect(state.statements.some((sql) => sql.includes('DELETE'))).toBe(false);
      });

      it('stops at the cap of one run and warns', async () => {
         const { service, state } = database({ visible: 200_000, deletable: 150_000 });
         const warn = jest.spyOn(Logger.prototype, 'warn');

         const result = await service.deleteStaleScores();

         expect(result).toEqual({ deleted: 50_000, remaining: 150_000, stop: 'cap' });
         expect(state.deletable).toBe(100_000);
         expect(warn).toHaveBeenCalledWith(expect.stringContaining('cap of 50000'));
      });

      it('fits the last batch into the cap', async () => {
         const { service } = database({ visible: 10_000, deletable: 5000 });

         expect(
            await service.deleteStaleScores(limits({ maxDeletedPerRun: 1500, batchSize: 1000 })),
         ).toEqual({ deleted: 1500, remaining: 8500, stop: 'cap' });
      });

      it('does not run when the database clock is off the API clock', async () => {
         const { service, prisma } = database({
            visible: 5000,
            deletable: 4000,
            clockOffMs: 24 * 60 * 60 * 1000,
         });

         expect(await service.deleteStaleScores()).toEqual({
            deleted: 0,
            remaining: 5000,
            stop: 'clock',
         });
         expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('refuses unsafe limits before touching the database', async () => {
         const { service, prisma } = database({ visible: 5000, deletable: 4000 });

         await expect(service.deleteStaleScores(limits({ retentionDays: 1 }))).rejects.toThrow(
            /retentionDays must be at least 7/,
         );
         expect(prisma.$queryRaw).not.toHaveBeenCalled();
      });

      it('measures age by the database clock and protects the best runs in the delete itself', async () => {
         const { service, state } = database({ visible: 5000, deletable: 10 });

         await service.deleteStaleScores();

         const sql = state.statements.find((statement) => statement.includes('DELETE')) ?? '';
         const compact = sql.replace(/\s+/g, ' ');
         expect(compact).toContain('stale.hidden = false');
         expect(compact).toContain("(now() AT TIME ZONE 'UTC') - make_interval(days => ?::int)");
         expect(compact).toContain(
            'ORDER BY kept.score DESC, kept.created_at ASC, kept.id ASC OFFSET ?::int LIMIT 1',
         );
         expect(compact).toContain('stale.score < (');
      });

      describe('the count retention', () => {
         const overflowDeletes = (statements: string[]) =>
            statements.filter((sql) => sql.includes('runner_scores AS extra'));

         it('runs no batch of its own while the visible runs are within the bound', async () => {
            const { service, state, prisma } = database({ visible: 49_000, deletable: 1000 });

            expect(await service.deleteStaleScores()).toEqual({
               deleted: 1000,
               remaining: 48_000,
               stop: 'done',
            });
            expect(overflowDeletes(state.statements)).toHaveLength(0);
            expect(prisma.$transaction).toHaveBeenCalledTimes(2);
         });

         it('deletes the old runs first, then the lowest others down to the bound, and warns', async () => {
            const { service, state } = database({ visible: 60_000, deletable: 4000 });
            const warn = jest.spyOn(Logger.prototype, 'warn');

            expect(await service.deleteStaleScores()).toEqual({
               deleted: 10_000,
               remaining: 50_000,
               stop: 'done',
            });
            expect(state.deletable).toBe(0);
            expect(overflowDeletes(state.statements)).toHaveLength(6);
            expect(warn).toHaveBeenCalledWith(
               expect.stringContaining('deleted 6000 runs younger than the retention'),
            );
         });

         it('shares the cap of one run with the old runs', async () => {
            const { service } = database({ visible: 120_000, deletable: 0 });

            expect(await service.deleteStaleScores()).toEqual({
               deleted: 50_000,
               remaining: 70_000,
               stop: 'cap',
            });
         });

         it('does not run after the old runs used up the cap', async () => {
            const { service, state } = database({ visible: 200_000, deletable: 150_000 });

            await service.deleteStaleScores();

            expect(overflowDeletes(state.statements)).toHaveLength(0);
         });

         it('follows the bound it is given', async () => {
            const { service } = database({ visible: 3500, deletable: 0 });

            expect(await service.deleteStaleScores(limits({ maxVisibleRuns: 2000 }))).toEqual({
               deleted: 1500,
               remaining: 2000,
               stop: 'done',
            });
         });

         it('takes visible runs from the bottom of the leaderboard order, whatever their age', async () => {
            const { service, state } = database({ visible: 50_010, deletable: 0 });

            await service.deleteStaleScores();

            const [sql] = overflowDeletes(state.statements);
            const compact = sql.replace(/\s+/g, ' ');
            expect(compact).toContain('extra.hidden = false');
            expect(compact).toContain(
               'ORDER BY extra.score ASC, extra.created_at DESC, extra.id DESC LIMIT ?::int',
            );
            expect(compact).not.toContain('created_at <');
         });
      });
   });
});
