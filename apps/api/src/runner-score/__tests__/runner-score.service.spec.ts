import { BadRequestException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import type IORedis from 'ioredis';

import type { CacheService } from '@/cache/cache.service';
import type { PrismaService } from '@/prisma/prisma.service';
import type { RateLimitService } from '@/rate-limit/rate-limit.service';

import { RunnerScoreService } from '../runner-score.service';

describe('RunnerScoreService', () => {
   let prisma: {
      runnerScore: {
         create: jest.Mock;
         findUnique: jest.Mock;
         update: jest.Mock;
         delete: jest.Mock;
         findMany: jest.Mock;
         findFirst: jest.Mock;
         count: jest.Mock;
      };
   };
   let rateLimit: { hit: jest.Mock };
   let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
   let redis: { set: jest.Mock; getdel: jest.Mock };
   let service: RunnerScoreService;
   const RUN_ID = '5f0c1b2e-8d4a-4f6e-9b1a-2c3d4e5f6a7b';
   const startedAgo = (seconds: number) =>
      redis.getdel.mockResolvedValue(String(Date.now() - seconds * 1000));

   beforeEach(() => {
      prisma = {
         runnerScore: {
            create: jest.fn().mockImplementation(({ data }) => ({ id: 1, ...data })),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
         },
      };
      rateLimit = { hit: jest.fn().mockResolvedValue({ allowed: true, count: 1 }) };
      cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
      redis = { set: jest.fn(), getdel: jest.fn() };
      startedAgo(3600);
      service = new RunnerScoreService(
         prisma as unknown as PrismaService,
         rateLimit as unknown as RateLimitService,
         cache as unknown as CacheService,
         redis as unknown as IORedis,
      );
   });

   describe('startRun', () => {
      it('keeps when the run started, limited per IP address', async () => {
         const { runId } = await service.startRun('1.2.3.4');

         expect(runId).toMatch(/^[0-9a-f-]{36}$/);
         expect(rateLimit.hit).toHaveBeenCalledWith(
            'runner-score:run:1.2.3.4',
            expect.any(Number),
            expect.any(Number),
         );
         expect(redis.set).toHaveBeenCalledWith(
            `runner-score:run:${runId}`,
            expect.any(Number),
            'EX',
            2 * 60 * 60,
         );
      });

      it('answers 429 when the address started too many', async () => {
         rateLimit.hit.mockResolvedValue({ allowed: false, count: 241, retryAfterSeconds: 60 });

         const error = await service.startRun('1.2.3.4').catch((e: unknown) => e);

         expect((error as HttpException).getStatus()).toBe(429);
         expect(redis.set).not.toHaveBeenCalled();
      });
   });

   describe('submit', () => {
      it('saves a plausible score, limited per IP address', async () => {
         const result = await service.submit(
            { runId: RUN_ID, nick: 'MMK', score: 1186, seconds: 300 },
            '1.2.3.4',
         );

         expect(rateLimit.hit).toHaveBeenCalledWith(
            'runner-score:submit:1.2.3.4',
            expect.any(Number),
            expect.any(Number),
         );
         expect(prisma.runnerScore.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: { nick: 'MMK', score: 1186, seconds: 300 } }),
         );
         expect(result).toMatchObject({ id: 1, nick: 'MMK', score: 1186 });
         expect(redis.getdel).toHaveBeenCalledWith(`runner-score:run:${RUN_ID}`);
      });

      it('answers with every field of the saved score, hidden included', async () => {
         await service.submit({ runId: RUN_ID, nick: 'MMK', score: 1186, seconds: 300 }, '1.2.3.4');

         expect(prisma.runnerScore.create).toHaveBeenCalledWith(
            expect.objectContaining({
               select: {
                  id: true,
                  nick: true,
                  score: true,
                  seconds: true,
                  hidden: true,
                  createdAt: true,
               },
            }),
         );
      });

      it('accepts a run shorter than 5 s without storing it', async () => {
         const result = await service.submit(
            { runId: RUN_ID, nick: 'DOE', score: 4, seconds: 4 },
            '1.2.3.4',
         );

         expect(result).toEqual({ kept: false, minSeconds: 5 });
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
         expect(cache.del).not.toHaveBeenCalled();
         expect(redis.getdel).toHaveBeenCalledWith(`runner-score:run:${RUN_ID}`);
      });

      it('refuses an empty run sent straight after the start, as any implausible one', async () => {
         startedAgo(0);

         await expect(
            service.submit({ runId: RUN_ID, nick: 'DOE', score: 0, seconds: 5 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
      });

      describe('the cached leaderboard', () => {
         const cachedTop = (players: number, lowest: number) =>
            cache.get.mockResolvedValue({
               players: Array.from({ length: players }, (_, i) => ({
                  nick: `P${i}`,
                  score: lowest + (players - 1 - i) * 10,
                  seconds: 60,
               })),
            });
         const submit = (score: number) =>
            service.submit({ runId: RUN_ID, nick: 'DOE', score, seconds: 300 }, '1.2.3.4');

         it('is dropped by a score reaching the tenth place', async () => {
            cachedTop(10, 500);

            await submit(500);

            expect(cache.del).toHaveBeenCalledWith('runner-score:top:v2');
         });

         it('stays when the score is below the tenth place', async () => {
            cachedTop(10, 500);

            await submit(499);

            expect(cache.del).not.toHaveBeenCalled();
         });

         it('is dropped by any score while it has fewer than ten players', async () => {
            cachedTop(3, 500);

            await submit(300);

            expect(cache.del).toHaveBeenCalledWith('runner-score:top:v2');
         });

         it('is dropped by a run of a nick that already holds the whole top ten', async () => {
            cache.get.mockResolvedValue({
               players: Array.from({ length: 10 }, (_, i) => ({
                  nick: 'DOE',
                  score: 1000 - i,
                  seconds: 60,
               })),
            });

            await submit(1500);

            expect(cache.del).toHaveBeenCalledWith('runner-score:top:v2');
         });

         it('has nothing to drop when it is not cached', async () => {
            await submit(1000);

            expect(cache.del).not.toHaveBeenCalled();
         });
      });

      it('refuses a run the server did not start, or one already saved', async () => {
         redis.getdel.mockResolvedValue(null);

         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 10, seconds: 10 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
      });

      it('refuses a run claiming more time than passed since it started', async () => {
         startedAgo(20);

         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 300, seconds: 60 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
      });

      it('accepts a run a moment longer than the server saw, as the start request lags', async () => {
         startedAgo(20);

         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 50, seconds: 22 }, '1.2.3.4'),
         ).resolves.toBeDefined();
      });

      it('accepts a short run with a few early points', async () => {
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 34, seconds: 2 }, '1.2.3.4'),
         ).resolves.toBeDefined();
      });

      it('allows 7 points a second plus 20 early in a run, nothing above', async () => {
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 440, seconds: 60 }, '1.2.3.4'),
         ).resolves.toBeDefined();
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 441, seconds: 60 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('allows 6 points a second plus 100 in a long run, nothing above', async () => {
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 1900, seconds: 300 }, '1.2.3.4'),
         ).resolves.toBeDefined();
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 1901, seconds: 300 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('refuses fewer points than seconds played', async () => {
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 59, seconds: 60 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
      });

      it('refuses a score the time played cannot give', async () => {
         await expect(
            service.submit({ runId: RUN_ID, nick: 'ABC', score: 100_000, seconds: 10 }, '1.2.3.4'),
         ).rejects.toBeInstanceOf(BadRequestException);
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
      });

      it('answers 429 when the address sent too many', async () => {
         rateLimit.hit.mockResolvedValue({ allowed: false, count: 241, retryAfterSeconds: 60 });

         const error = await service
            .submit({ runId: RUN_ID, nick: 'ABC', score: 10, seconds: 10 }, '1.2.3.4')
            .catch((e: unknown) => e);

         expect(error).toBeInstanceOf(HttpException);
         expect((error as HttpException).getStatus()).toBe(429);
         expect(prisma.runnerScore.create).not.toHaveBeenCalled();
      });

      describe('the daily numbers of stored runs', () => {
         const DAY = 24 * 60 * 60;
         const SHARED = 'runner-score:kept';
         const BY_ADDRESS = 'runner-score:kept:ip:1.2.3.4';
         const LEADERBOARD = 'runner-score:kept:leaderboard';
         const counters = (start: Record<string, number> = {}) => {
            const counts = new Map(Object.entries(start));
            rateLimit.hit.mockImplementation((key: string, max: number) => {
               const count = (counts.get(key) ?? 0) + 1;
               counts.set(key, count);
               return Promise.resolve({ allowed: count <= max, count, retryAfterSeconds: 600 });
            });
            return counts;
         };
         const fullTop = (lowest: number) =>
            prisma.runnerScore.findMany.mockResolvedValue(
               Array.from({ length: 10 }, (_, i) => ({
                  nick: `P${i}`,
                  score: lowest + (9 - i) * 10,
                  seconds: 300,
               })),
            );
         const submit = (score: number, ipAddress = '1.2.3.4') =>
            service.submit({ runId: RUN_ID, nick: 'DOE', score, seconds: 300 }, ipAddress);
         const hitKeys = () => rateLimit.hit.mock.calls.map(([key]) => key as string);

         it('counts a run about to be stored by its address, 200 a day, then for all, 2000 a day', async () => {
            counters();

            await submit(400);

            expect(rateLimit.hit).toHaveBeenCalledWith(BY_ADDRESS, 200, DAY);
            expect(rateLimit.hit).toHaveBeenCalledWith(SHARED, 2000, DAY);
            expect(hitKeys().indexOf(BY_ADDRESS)).toBeLessThan(hitKeys().indexOf(SHARED));
            expect(hitKeys()).not.toContain(LEADERBOARD);
            expect(prisma.runnerScore.create).toHaveBeenCalledTimes(1);
         });

         it('does not count a run too short to be stored', async () => {
            counters();

            await service.submit({ runId: RUN_ID, nick: 'DOE', score: 4, seconds: 4 }, '1.2.3.4');

            expect(hitKeys()).toEqual(['runner-score:submit:1.2.3.4']);
         });

         it('stores no run below the leaderboard over the number of its address, and leaves the shared one', async () => {
            counters({ [BY_ADDRESS]: 200 });
            fullTop(1000);

            expect(await submit(400)).toEqual({ kept: false, minSeconds: 5 });
            expect(prisma.runnerScore.create).not.toHaveBeenCalled();
            expect(hitKeys()).not.toContain(SHARED);
         });

         it('stores no run below the leaderboard over the number for all, and counts nothing more', async () => {
            counters({ [SHARED]: 2000 });
            fullTop(1000);

            expect(await submit(400)).toEqual({ kept: false, minSeconds: 5 });
            expect(prisma.runnerScore.create).not.toHaveBeenCalled();
            expect(cache.del).not.toHaveBeenCalled();
            expect(hitKeys()).not.toContain(LEADERBOARD);
         });

         it('over it does not store a run only equal to the tenth place: it stands after', async () => {
            counters({ [SHARED]: 2000 });
            fullTop(1000);

            expect(await submit(1000)).toEqual({ kept: false, minSeconds: 5 });
            expect(prisma.runnerScore.create).not.toHaveBeenCalled();
         });

         it('over it stores a run entering the leaderboard, counted against a bound of its own', async () => {
            counters({ [SHARED]: 2000 });
            fullTop(1000);

            expect(await submit(1001)).toMatchObject({ id: 1, score: 1001 });
            expect(rateLimit.hit).toHaveBeenCalledWith(LEADERBOARD, 100, DAY);
         });

         it('over it stores any run while the leaderboard is not full', async () => {
            counters({ [BY_ADDRESS]: 200 });
            prisma.runnerScore.findMany.mockResolvedValue([
               { nick: 'A', score: 900, seconds: 300 },
            ]);

            expect(await submit(300)).toMatchObject({ id: 1, score: 300 });
         });

         it('over it reads the leaderboard from the cache when it is there', async () => {
            counters({ [SHARED]: 2000 });
            cache.get.mockResolvedValue({
               players: Array.from({ length: 10 }, () => ({
                  nick: 'A',
                  score: 1500,
                  seconds: 300,
               })),
            });

            expect(await submit(1400)).toEqual({ kept: false, minSeconds: 5 });
            expect(prisma.runnerScore.findMany).not.toHaveBeenCalled();
         });

         it('over it stores at most 100 runs entering the leaderboard, however many arrive at once', async () => {
            counters({ [SHARED]: 2000 });
            fullTop(1000);

            const results = await Promise.all(
               Array.from({ length: 150 }, (_, i) => submit(1500 + i, `10.0.0.${i % 50}`)),
            );

            expect(prisma.runnerScore.create).toHaveBeenCalledTimes(100);
            expect(results.filter((result) => 'kept' in result)).toHaveLength(50);
         });

         it('stores at most the numbers for all a day, from any number of addresses', async () => {
            counters({ [SHARED]: 1990 });
            fullTop(100_000);

            await Promise.all(Array.from({ length: 50 }, (_, i) => submit(400, `10.0.1.${i}`)));

            expect(prisma.runnerScore.create).toHaveBeenCalledTimes(10);
         });

         it('warns once a window when the number for all is reached', async () => {
            counters({ [SHARED]: 1999 });
            fullTop(100_000);
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            warn.mockClear();

            for (let i = 0; i < 4; i++) await submit(400, `10.0.2.${i}`);

            const capWarnings = warn.mock.calls.filter(([message]) =>
               String(message).includes('daily number of 2000 stored runs'),
            );
            expect(capWarnings).toHaveLength(1);
            expect(prisma.runnerScore.create).toHaveBeenCalledTimes(1);
            warn.mockRestore();
         });

         it('warns once a window when the bound of runs entering the leaderboard is reached', async () => {
            counters({ [SHARED]: 2000, [LEADERBOARD]: 99 });
            fullTop(1000);
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            warn.mockClear();

            for (let i = 0; i < 4; i++) await submit(1500 + i);

            const boundWarnings = warn.mock.calls.filter(([message]) =>
               String(message).includes('daily number of 100 runs stored over'),
            );
            expect(boundWarnings).toHaveLength(1);
            expect(prisma.runnerScore.create).toHaveBeenCalledTimes(1);
            warn.mockRestore();
         });

         it('stores the run when a counter fails, like every rate limit', async () => {
            rateLimit.hit.mockResolvedValue({ allowed: true, count: 0, retryAfterSeconds: 0 });

            expect(await submit(400)).toMatchObject({ id: 1 });
         });
      });
   });

   describe('top players', () => {
      it('lists the ten best visible runs, the same nick as often as it has them', async () => {
         const rows = [
            { nick: 'MAR', score: 820, seconds: 150 },
            { nick: 'MAR', score: 700, seconds: 120 },
            { nick: 'CCC', score: 296, seconds: 75 },
         ];
         prisma.runnerScore.findMany.mockResolvedValue(rows);

         const result = await service.findTopPlayers();

         expect(prisma.runnerScore.findMany).toHaveBeenCalledWith({
            where: { hidden: false },
            orderBy: [{ score: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
            take: 10,
            select: { nick: true, score: true, seconds: true },
         });
         expect(result).toEqual({ players: rows });
         expect(cache.set).toHaveBeenCalledWith('runner-score:top:v2', result, expect.any(Number));
      });

      it('answers from the cache while it holds the leaderboard', async () => {
         const top = { players: [{ nick: 'MAR', score: 296, seconds: 75 }] };
         cache.get.mockResolvedValue(top);

         expect(await service.findTopPlayers()).toBe(top);
         expect(prisma.runnerScore.findMany).not.toHaveBeenCalled();
      });
   });

   describe('rank', () => {
      it('places a score after every visible run with a higher or equal score, own ones included', async () => {
         prisma.runnerScore.count.mockResolvedValue(7);

         const result = await service.findRank({ score: 700 });

         expect(prisma.runnerScore.count).toHaveBeenCalledWith({
            where: { hidden: false, score: { gte: 700 } },
            take: 50_000,
         });
         expect(result).toEqual({ rank: 8 });
      });

      it('counts at most 50 000 runs ahead, so a public request reads a bounded range', async () => {
         prisma.runnerScore.count.mockResolvedValue(50_000);

         expect(await service.findRank({ score: 5 })).toEqual({ rank: 50_001 });
         expect(prisma.runnerScore.count).toHaveBeenCalledWith(
            expect.objectContaining({ take: 50_000 }),
         );
      });

      it('ranks first on an empty leaderboard', async () => {
         prisma.runnerScore.count.mockResolvedValue(0);

         expect(await service.findRank({ score: 5 })).toEqual({ rank: 1 });
      });
   });

   describe('stats', () => {
      it('counts every run, takes the visible top in leaderboard order and the latest run', async () => {
         const top = [{ id: 1, nick: 'AAA', score: 9 }];
         const latest = { id: 7, nick: 'ZZZ', hidden: true };
         prisma.runnerScore.count.mockResolvedValue(12);
         prisma.runnerScore.findMany.mockResolvedValue(top);
         prisma.runnerScore.findFirst.mockResolvedValue(latest);

         await expect(service.findStats()).resolves.toEqual({ totalRuns: 12, top, latest });

         expect(prisma.runnerScore.count).toHaveBeenCalledWith();
         expect(prisma.runnerScore.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
               where: { hidden: false },
               orderBy: [{ score: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
               take: 10,
            }),
         );
         expect(prisma.runnerScore.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
         );
      });
   });

   describe('admin', () => {
      it('hides a score', async () => {
         prisma.runnerScore.findUnique.mockResolvedValue({ id: 5, hidden: false });

         await service.updateVisibility(5, { hidden: true });

         expect(prisma.runnerScore.update).toHaveBeenCalledWith({
            where: { id: 5 },
            data: { hidden: true },
         });
         expect(cache.del).toHaveBeenCalledWith('runner-score:top:v2');
      });

      it('deletes a score', async () => {
         prisma.runnerScore.findUnique.mockResolvedValue({ id: 5 });

         await service.remove(5);

         expect(prisma.runnerScore.delete).toHaveBeenCalledWith({ where: { id: 5 } });
         expect(cache.del).toHaveBeenCalledWith('runner-score:top:v2');
      });

      it('answers 404 for a score that does not exist', async () => {
         prisma.runnerScore.findUnique.mockResolvedValue(null);

         await expect(service.remove(9)).rejects.toBeInstanceOf(NotFoundException);
         await expect(service.updateVisibility(9, { hidden: true })).rejects.toBeInstanceOf(
            NotFoundException,
         );
      });
   });
});
