import type IORedis from 'ioredis';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';
import {
   KEPT_LEADERBOARD_RUNS_KEY,
   KEPT_RUNS_KEY,
   keptRunsByAddressKey,
   RunnerScoreService,
} from '../../../src/runner-score/runner-score.service';
import { RunnerScoreCleanupService } from '../../../src/runner-score/runner-score-cleanup.service';
import { getApp, getHttpServer } from '../../setup/init';

describe('RunnerScorePublicController (e2e)', () => {
   let prisma: PrismaService;
   let redis: IORedis;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
      redis = getApp().get(REDIS_CLIENT);
   });

   const cleanup = async () => {
      await prisma.runnerScore.deleteMany();
      await redis.flushdb();
   };

   beforeEach(cleanup);
   afterAll(cleanup);

   const playedRun = async (seconds: number): Promise<string> => {
      const { runId } = (await getHttpServer().post('/public/runner-scores/runs')).body;
      await redis.set(`runner-score:run:${runId}`, Date.now() - seconds * 1000, 'EX', 3600);
      return runId;
   };

   const scores = (rows: { nick: string; score: number; hidden?: boolean }[]) =>
      prisma.runnerScore.createMany({ data: rows.map((row) => ({ seconds: 60, ...row })) });

   describe('GET /public/runner-scores/rank', () => {
      it('places a score after every visible run with a higher or equal score', async () => {
         await scores([
            { nick: 'AAA', score: 900 },
            { nick: 'AAA', score: 100 },
            { nick: 'BBB', score: 500 },
            { nick: 'CCC', score: 500 },
            { nick: 'DDD', score: 300 },
            { nick: 'EEE', score: 2000, hidden: true },
         ]);

         const rank = async (score: number) =>
            (await getHttpServer().get(`/public/runner-scores/rank?score=${score}`)).body.rank;

         expect(await rank(1000)).toBe(1);
         expect(await rank(900)).toBe(2);
         expect(await rank(500)).toBe(4);
         expect(await rank(400)).toBe(4);
         expect(await rank(100)).toBe(6);
         expect(await rank(50)).toBe(6);
      });

      it('answers 400 for a score that is not a number', async () => {
         const response = await getHttpServer().get('/public/runner-scores/rank?score=abc');

         expect(response.status).toBe(400);
      });
   });

   describe('GET /public/runner-scores/top', () => {
      it('lists the best visible runs, the same nick several times, equal scores oldest first', async () => {
         await prisma.runnerScore.createMany({
            data: [
               {
                  nick: 'AAA',
                  score: 900,
                  seconds: 60,
                  createdAt: new Date('2026-11-01T10:00:00Z'),
               },
               {
                  nick: 'BBB',
                  score: 950,
                  seconds: 60,
                  createdAt: new Date('2026-11-02T10:00:00Z'),
               },
               {
                  nick: 'AAA',
                  score: 950,
                  seconds: 60,
                  createdAt: new Date('2026-11-01T10:00:00Z'),
               },
               { nick: 'EEE', score: 2000, seconds: 60, hidden: true },
               { nick: 'AAA', score: 500, seconds: 60 },
            ],
         });

         const response = await getHttpServer().get('/public/runner-scores/top');

         expect(response.status).toBe(200);
         expect(response.body.players).toEqual([
            { nick: 'AAA', score: 950, seconds: 60 },
            { nick: 'BBB', score: 950, seconds: 60 },
            { nick: 'AAA', score: 900, seconds: 60 },
            { nick: 'AAA', score: 500, seconds: 60 },
         ]);
      });

      it('can be filled by one player alone, a new run ranked among those runs', async () => {
         await scores([
            ...Array.from({ length: 12 }, (_, i) => ({ nick: 'MMK', score: 1200 - i * 10 })),
            { nick: 'BBB', score: 1000 },
         ]);

         const top = (await getHttpServer().get('/public/runner-scores/top')).body.players;

         expect(top).toEqual(
            Array.from({ length: 10 }, (_, i) => ({
               nick: 'MMK',
               score: 1200 - i * 10,
               seconds: 60,
            })),
         );
         const service = getApp().get(RunnerScoreService);
         for (const [index, player] of top.entries()) {
            expect(await service.findRank({ score: player.score + 1 })).toEqual({
               rank: index + 1,
            });
            expect(await service.findRank({ score: player.score })).toEqual({ rank: index + 2 });
         }
      });
   });

   describe('POST /public/runner-scores/runs', () => {
      it('counts the started runs per X-Real-IP, not per X-Forwarded-For', async () => {
         const start = (forwardedFor: string) =>
            getHttpServer()
               .post('/public/runner-scores/runs')
               .set('X-Real-IP', '198.51.100.9')
               .set('X-Forwarded-For', forwardedFor);

         expect((await start('203.0.113.1')).status).toBe(201);
         expect((await start('203.0.113.2')).status).toBe(201);

         expect(await redis.get('runner-score:run:198.51.100.9')).toBe('2');
      });
   });

   describe('POST /public/runner-scores', () => {
      it('saves a score for a run the server started, once, and shows it on the leaderboard', async () => {
         await getHttpServer().get('/public/runner-scores/top');
         const runId = await playedRun(30);
         const score = { runId, nick: 'm1', score: 120, seconds: 30 };

         const saved = await getHttpServer().post('/public/runner-scores').send(score);
         const again = await getHttpServer().post('/public/runner-scores').send(score);
         const top = await getHttpServer().get('/public/runner-scores/top');

         expect(saved.status).toBe(201);
         expect(saved.body).toMatchObject({ nick: 'M1', score: 120, seconds: 30, hidden: false });
         expect(again.status).toBe(400);
         expect(top.body.players).toEqual([{ nick: 'M1', score: 120, seconds: 30 }]);
      });

      it('accepts a run shorter than 5 s without storing it', async () => {
         const { runId } = (await getHttpServer().post('/public/runner-scores/runs')).body;

         const response = await getHttpServer()
            .post('/public/runner-scores')
            .send({ runId, nick: 'DOE', score: 0, seconds: 0 });

         expect(response.status).toBe(200);
         expect(response.body).toEqual({ kept: false, minSeconds: 5 });
         expect(await prisma.runnerScore.count()).toBe(0);
      });

      it('refuses fewer points than seconds played', async () => {
         const runId = await playedRun(30);

         const response = await getHttpServer()
            .post('/public/runner-scores')
            .send({ runId, nick: 'XXX', score: 0, seconds: 30 });

         expect(response.status).toBe(400);
         expect(await prisma.runnerScore.count()).toBe(0);
      });

      it('refuses a run claiming more time than passed since it started', async () => {
         const { runId } = (await getHttpServer().post('/public/runner-scores/runs')).body;

         const response = await getHttpServer()
            .post('/public/runner-scores')
            .send({ runId, nick: 'XXX', score: 1_000_000, seconds: 50_000 });

         expect(response.status).toBe(400);
         expect(await prisma.runnerScore.count()).toBe(0);
      });

      it('refuses a run the server never started', async () => {
         const response = await getHttpServer().post('/public/runner-scores').send({
            runId: '5f0c1b2e-8d4a-4f6e-9b1a-2c3d4e5f6a7b',
            nick: 'XXX',
            score: 10,
            seconds: 1,
         });

         expect(response.status).toBe(400);
      });

      describe('the daily numbers of stored runs', () => {
         const send = async (nick: string, score: number, ip = '203.0.113.7') =>
            getHttpServer()
               .post('/public/runner-scores')
               .set('X-Forwarded-For', ip)
               .send({ runId: await playedRun(300), nick, score, seconds: 300 });

         it('counts a stored run, not one too short to be stored', async () => {
            const { runId } = (await getHttpServer().post('/public/runner-scores/runs')).body;
            await getHttpServer()
               .post('/public/runner-scores')
               .send({ runId, nick: 'DOE', score: 0, seconds: 0 });
            expect(await redis.get(KEPT_RUNS_KEY)).toBeNull();

            await send('ONE', 400);

            expect(await redis.get(KEPT_RUNS_KEY)).toBe('1');
         });

         it('over it stores only a run entering the leaderboard', async () => {
            await scores(Array.from({ length: 10 }, (_, i) => ({ nick: 'TOP', score: 1000 + i })));
            await redis.set(KEPT_RUNS_KEY, 2000, 'EX', 3600);

            const low = await send('LOW', 400);
            const tie = await send('TIE', 1000);
            const high = await send('HI', 1500);

            expect(low.status).toBe(200);
            expect(low.body).toEqual({ kept: false, minSeconds: 5 });
            expect(tie.status).toBe(200);
            expect(tie.body).toEqual({ kept: false, minSeconds: 5 });
            expect(high.status).toBe(201);
            expect(
               await prisma.runnerScore.count({ where: { nick: { in: ['LOW', 'TIE'] } } }),
            ).toBe(0);
            const top = await getHttpServer().get('/public/runner-scores/top');
            expect(top.body.players[0]).toEqual({ nick: 'HI', score: 1500, seconds: 300 });
         });

         it('over the number of a client address stores no run below the leaderboard, and leaves the shared number', async () => {
            await scores(Array.from({ length: 10 }, (_, i) => ({ nick: 'TOP', score: 1000 + i })));
            await redis.set(keptRunsByAddressKey('203.0.113.7'), 200, 'EX', 3600);

            const low = await send('LOW', 400, '203.0.113.7');
            const other = await send('OTH', 400, '203.0.113.8');

            expect(low.status).toBe(200);
            expect(low.body).toEqual({ kept: false, minSeconds: 5 });
            expect(await prisma.runnerScore.count({ where: { nick: 'LOW' } })).toBe(0);
            expect(other.status).toBe(201);
            expect(await redis.get(KEPT_RUNS_KEY)).toBe('1');
         });

         it('over it stores no more runs entering the leaderboard than their own bound', async () => {
            await scores(Array.from({ length: 10 }, (_, i) => ({ nick: 'TOP', score: 1000 + i })));
            await redis.set(KEPT_RUNS_KEY, 2000, 'EX', 3600);
            await redis.set(KEPT_LEADERBOARD_RUNS_KEY, 100, 'EX', 3600);

            const high = await send('HI', 1500);

            expect(high.status).toBe(200);
            expect(high.body).toEqual({ kept: false, minSeconds: 5 });
            expect(await prisma.runnerScore.count({ where: { nick: 'HI' } })).toBe(0);
         });

         it('over it stores at most the bound when many runs entering the leaderboard arrive at once', async () => {
            await scores(Array.from({ length: 10 }, (_, i) => ({ nick: 'TOP', score: 1000 + i })));
            await redis.set(KEPT_RUNS_KEY, 2000, 'EX', 3600);
            await redis.set(KEPT_LEADERBOARD_RUNS_KEY, 95, 'EX', 3600);
            const runIds: string[] = [];
            for (let i = 0; i < 30; i++) runIds.push(await playedRun(300));

            const responses = await Promise.all(
               runIds.map((runId, i) =>
                  getHttpServer()
                     .post('/public/runner-scores')
                     .send({ runId, nick: 'RUN', score: 1500 + i, seconds: 300 }),
               ),
            );

            expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
            expect(
               responses.filter(
                  (response) => response.status === 200 && response.body.kept === false,
               ),
            ).toHaveLength(25);
            expect(await prisma.runnerScore.count({ where: { nick: 'RUN' } })).toBe(5);
         });
      });
   });

   describe('the cleanup of old scores', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const old = (days = 60) => new Date(Date.now() - days * DAY);
      const cleanupService = () => getApp().get(RunnerScoreCleanupService);
      const small = {
         protectedBestRuns: 10,
         minVisibleRunsAfter: 10,
         maxVisibleRuns: 50_000,
         maxDeletedPerRun: 50_000,
         batchSize: 1000,
         retentionDays: 30,
      };

      const oldRuns = (count: number, from = 0) =>
         prisma.runnerScore.createMany({
            data: Array.from({ length: count }, (_, i) => ({
               nick: `N${(from + i) % 37}`,
               score: 10 + (((from + i) * 7919) % 1400),
               seconds: 60,
               createdAt: old(40 + ((from + i) % 20)),
            })),
         });

      const snapshot = async () => {
         await redis.flushdb();
         const service = getApp().get(RunnerScoreService);
         const top = await service.findTopPlayers();
         const rows = await prisma.runnerScore.findMany({
            where: { hidden: false },
            orderBy: [{ score: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true, score: true },
         });
         const ranks = new Map<number, number>();
         for (const score of new Set(rows.map((row) => row.score))) {
            ranks.set(score, (await service.findRank({ score })).rank);
         }
         return { top, rows, ranks };
      };

      it('keeps the 999 best runs and the leaderboard when every run is past the retention', async () => {
         await oldRuns(1500);
         await prisma.runnerScore.createMany({
            data: Array.from({ length: 20 }, (_, i) => ({
               nick: 'HID',
               score: i,
               seconds: 60,
               hidden: true,
               createdAt: old(300),
            })),
         });
         const before = await snapshot();
         const threshold = before.rows[998].score;

         const result = await cleanupService().deleteStaleScores();

         const after = await snapshot();
         const protectedRows = before.rows.filter((row) => row.score >= threshold);
         expect(protectedRows.length).toBeGreaterThanOrEqual(999);
         expect(after.rows).toEqual(protectedRows);
         expect(result).toEqual({
            deleted: 1500 - protectedRows.length,
            remaining: protectedRows.length,
            stop: protectedRows.length === 999 ? 'floor' : 'done',
         });
         expect(after.top).toEqual(before.top);
         expect(after.top.players).toHaveLength(10);
         for (const { score } of protectedRows) {
            expect(after.ranks.get(score)).toBe(before.ranks.get(score));
         }
         expect(await prisma.runnerScore.count({ where: { hidden: true } })).toBe(20);
      });

      it('never deletes the runs of a player who fills the whole top 10', async () => {
         await prisma.runnerScore.createMany({
            data: Array.from({ length: 10 }, (_, i) => ({
               nick: 'MMK',
               score: 5000 - i,
               seconds: 600,
               createdAt: old(365),
            })),
         });
         await oldRuns(1200);
         const before = await snapshot();

         await cleanupService().deleteStaleScores();

         const after = await snapshot();
         expect(after.top).toEqual({
            players: Array.from({ length: 10 }, (_, i) => ({
               nick: 'MMK',
               score: 5000 - i,
               seconds: 600,
            })),
         });
         expect(after.top).toEqual(before.top);
         expect(await prisma.runnerScore.count({ where: { nick: 'MMK' } })).toBe(10);
         for (let i = 0; i < 10; i++) {
            expect(after.ranks.get(5000 - i)).toBe(i + 2);
         }
      });

      it('deletes nothing while there are fewer runs than the protected ones', async () => {
         await oldRuns(500);

         const result = await cleanupService().deleteStaleScores();

         expect(result).toEqual({ deleted: 0, remaining: 500, stop: 'floor' });
         expect(await prisma.runnerScore.count()).toBe(500);
      });

      it('keeps every run younger than the retention', async () => {
         await oldRuns(1100);
         await prisma.runnerScore.createMany({
            data: Array.from({ length: 50 }, (_, i) => ({
               nick: 'NEW',
               score: i,
               seconds: 60,
               createdAt: old(29),
            })),
         });

         await cleanupService().deleteStaleScores();

         expect(await prisma.runnerScore.count({ where: { nick: 'NEW' } })).toBe(50);
      });

      it('stops at the per-run cap', async () => {
         await oldRuns(30);

         const result = await cleanupService().deleteStaleScores({
            ...small,
            maxDeletedPerRun: 7,
            batchSize: 3,
         });

         expect(result).toEqual({ deleted: 7, remaining: 23, stop: 'cap' });
         expect(await prisma.runnerScore.count()).toBe(23);
      });

      it('never goes below the floor of visible runs', async () => {
         await oldRuns(30);

         const result = await cleanupService().deleteStaleScores({
            ...small,
            minVisibleRunsAfter: 25,
            batchSize: 4,
         });

         expect(result).toEqual({ deleted: 5, remaining: 25, stop: 'floor' });
      });

      it('deletes the lowest runs first', async () => {
         await oldRuns(30);
         const lowest = await prisma.runnerScore.findMany({
            orderBy: [{ score: 'asc' }, { id: 'asc' }],
            take: 7,
            select: { id: true },
         });

         await cleanupService().deleteStaleScores({ ...small, maxDeletedPerRun: 7, batchSize: 7 });

         expect(
            await prisma.runnerScore.count({ where: { id: { in: lowest.map((row) => row.id) } } }),
         ).toBe(0);
      });

      it('runs twice at once without deleting more than once', async () => {
         await oldRuns(3000);
         const before = await snapshot();
         const threshold = before.rows[998].score;
         const protectedRows = before.rows.filter((row) => row.score >= threshold);

         const [first, second] = await Promise.all([
            cleanupService().deleteStaleScores(),
            cleanupService().deleteStaleScores(),
         ]);

         expect(first.deleted + second.deleted).toBe(3000 - protectedRows.length);
         const after = await snapshot();
         expect(after.rows).toEqual(protectedRows);
         expect(after.top).toEqual(before.top);
      });

      describe('the count retention', () => {
         it('keeps the best visible runs up to the bound, whatever their age, and every hidden one', async () => {
            await prisma.runnerScore.createMany({
               data: Array.from({ length: 40 }, (_, i) => ({
                  nick: 'NEW',
                  score: 100 + (i % 20),
                  seconds: 60,
                  createdAt: old(1),
               })),
            });
            await scores(
               Array.from({ length: 5 }, (_, i) => ({ nick: 'HID', score: i, hidden: true })),
            );
            const before = await snapshot();

            const result = await cleanupService().deleteStaleScores({
               ...small,
               maxVisibleRuns: 25,
            });

            const after = await snapshot();
            expect(result).toEqual({ deleted: 15, remaining: 25, stop: 'done' });
            expect(after.rows).toEqual(before.rows.slice(0, 25));
            expect(after.top).toEqual(before.top);
            expect(await prisma.runnerScore.count({ where: { hidden: true } })).toBe(5);
         });

         it('deletes the old runs first, then the lowest young ones', async () => {
            await oldRuns(30);
            await prisma.runnerScore.createMany({
               data: Array.from({ length: 20 }, (_, i) => ({
                  nick: 'NEW',
                  score: 1 + i,
                  seconds: 60,
                  createdAt: old(1),
               })),
            });
            const before = await snapshot();

            const result = await cleanupService().deleteStaleScores({
               ...small,
               maxVisibleRuns: 15,
            });

            const after = await snapshot();
            expect(result.remaining).toBe(15);
            expect(result.stop).toBe('done');
            expect(after.top).toEqual(before.top);
            expect(await prisma.runnerScore.count({ where: { nick: 'NEW' } })).toBe(5);
            expect(
               await prisma.runnerScore.count({ where: { nick: 'NEW', score: { gte: 16 } } }),
            ).toBe(5);
         });
      });
   });
});
