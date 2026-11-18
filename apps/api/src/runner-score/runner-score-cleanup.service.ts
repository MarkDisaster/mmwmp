import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';

import {
   assertCleanupLimits,
   CLEANUP_LIMITS,
   type CleanupLimits,
   MAX_CLOCK_SKEW_SECONDS,
} from './runner-score.rules';

const CLEANUP_LOCK_KEY = 0x72756e;

type CleanupStop = 'done' | 'floor' | 'cap' | 'clock';

export type CleanupResult = { deleted: number; remaining: number; stop: CleanupStop };

@Injectable()
export class RunnerScoreCleanupService {
   private readonly logger = new Logger(RunnerScoreCleanupService.name);

   constructor(private readonly prisma: PrismaService) {}

   async deleteStaleScores(limits: CleanupLimits = CLEANUP_LIMITS): Promise<CleanupResult> {
      assertCleanupLimits(limits);

      const [{ epoch }] = await this.prisma.$queryRaw<{ epoch: number }[]>`
         SELECT extract(epoch FROM now())::float8 AS epoch`;
      const skewSeconds = Math.abs(epoch * 1000 - Date.now()) / 1000;
      if (skewSeconds > MAX_CLOCK_SKEW_SECONDS) {
         this.logger.warn(
            `Runner score cleanup skipped: the database clock is ${Math.round(skewSeconds)} s off the API clock`,
         );
         return { deleted: 0, remaining: await this.countVisible(), stop: 'clock' };
      }

      let deleted = 0;
      let stop: CleanupStop = 'done';
      let visibleAfter = 0;
      for (;;) {
         const budget = limits.maxDeletedPerRun - deleted;
         if (budget <= 0) {
            stop = 'cap';
            break;
         }
         const batch = await this.deleteBatch(limits, budget);
         deleted += batch.deleted;
         visibleAfter = batch.visible - batch.deleted;
         if (batch.limit === 0) {
            stop = 'floor';
            break;
         }
         if (batch.deleted < batch.limit) break;
      }

      let overflowDeleted = 0;
      if (stop === 'done' && visibleAfter > limits.maxVisibleRuns) {
         for (;;) {
            const budget = limits.maxDeletedPerRun - deleted;
            if (budget <= 0) {
               stop = 'cap';
               break;
            }
            const batch = await this.deleteOverflowBatch(limits, budget);
            deleted += batch.deleted;
            overflowDeleted += batch.deleted;
            if (batch.limit === 0 || batch.deleted < batch.limit) break;
         }
      }

      const remaining = await this.countVisible();
      if (overflowDeleted > 0) {
         this.logger.warn(
            `Runner score cleanup deleted ${overflowDeleted} runs younger than the retention: more than ${limits.maxVisibleRuns} visible runs were kept`,
         );
      }
      if (stop === 'cap') {
         this.logger.warn(
            `Runner score cleanup hit its cap of ${limits.maxDeletedPerRun} rows; the rest waits for the next run`,
         );
      }
      this.logger.log(
         `Runner score cleanup deleted ${deleted} rows, ${remaining} visible runs remain (${stop})`,
      );
      return { deleted, remaining, stop };
   }

   private deleteBatch(limits: CleanupLimits, budget: number) {
      return this.prisma.$transaction(async (tx) => {
         await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLEANUP_LOCK_KEY}::bigint)`;
         const [{ visible }] = await tx.$queryRaw<{ visible: number }[]>`
            SELECT count(*)::int AS visible FROM runner_scores WHERE hidden = false`;
         const limit = Math.max(
            0,
            Math.min(limits.batchSize, budget, visible - limits.minVisibleRunsAfter),
         );
         if (limit === 0) return { deleted: 0, limit, visible };

         const deleted = await tx.$executeRaw`
            DELETE FROM runner_scores
            WHERE id IN (
               SELECT stale.id
               FROM runner_scores AS stale
               WHERE stale.hidden = false
                  AND stale.created_at
                     < (now() AT TIME ZONE 'UTC') - make_interval(days => ${limits.retentionDays}::int)
                  AND stale.score < (
                     SELECT kept.score
                     FROM runner_scores AS kept
                     WHERE kept.hidden = false
                     ORDER BY kept.score DESC, kept.created_at ASC, kept.id ASC
                     OFFSET ${limits.protectedBestRuns - 1}::int
                     LIMIT 1
                  )
               ORDER BY stale.score ASC, stale.id ASC
               LIMIT ${limit}::int
            )`;
         return { deleted, limit, visible };
      });
   }

   private deleteOverflowBatch(limits: CleanupLimits, budget: number) {
      return this.prisma.$transaction(async (tx) => {
         await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLEANUP_LOCK_KEY}::bigint)`;
         const [{ visible }] = await tx.$queryRaw<{ visible: number }[]>`
            SELECT count(*)::int AS visible FROM runner_scores WHERE hidden = false`;
         const limit = Math.max(
            0,
            Math.min(limits.batchSize, budget, visible - limits.maxVisibleRuns),
         );
         if (limit === 0) return { deleted: 0, limit };

         const deleted = await tx.$executeRaw`
            DELETE FROM runner_scores
            WHERE id IN (
               SELECT extra.id
               FROM runner_scores AS extra
               WHERE extra.hidden = false
               ORDER BY extra.score ASC, extra.created_at DESC, extra.id DESC
               LIMIT ${limit}::int
            )`;
         return { deleted, limit };
      });
   }

   private countVisible() {
      return this.prisma.runnerScore.count({ where: { hidden: false } });
   }
}
