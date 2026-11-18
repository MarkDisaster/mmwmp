import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import {
   fetchRank,
   fetchTopPlayers,
   leaderboardRows,
   NICK,
   startRun,
   submitScore,
} from '../api/scoreApi';

vi.hoisted(() => {
   vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
});

afterAll(() => vi.unstubAllEnvs());

const RUN_ID = '5f0c1b2e-8d4a-4f6e-9b1a-2c3d4e5f6a7b';

const answer = (status: number) => vi.fn().mockResolvedValue({ ok: status < 300, status });

describe('the player name', () => {
   it('takes one to three letters or digits', () => {
      for (const nick of ['M', 'M1', 'MMK', '007']) expect(NICK.test(nick)).toBe(true);
   });

   it('refuses an empty, long or odd name', () => {
      for (const nick of ['', 'MMKA', 'M 1', 'mk', 'Ř']) expect(NICK.test(nick)).toBe(false);
   });
});

describe('starting a run', () => {
   afterEach(() => vi.unstubAllGlobals());

   it('returns the run the scoreboard started', async () => {
      const fetch = vi
         .fn()
         .mockResolvedValue({ ok: true, status: 201, json: async () => ({ runId: RUN_ID }) });
      vi.stubGlobal('fetch', fetch);

      expect(await startRun()).toBe(RUN_ID);
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://api.test/public/runner-scores/runs');
      expect(init.method).toBe('POST');
   });

   it('has no run when the scoreboard refuses or cannot be reached', async () => {
      vi.stubGlobal('fetch', answer(429));
      expect(await startRun()).toBeUndefined();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
      expect(await startRun()).toBeUndefined();
   });
});

describe('saving a score', () => {
   afterEach(() => vi.unstubAllGlobals());

   it('posts the name, score and seconds to the public endpoint', async () => {
      const fetch = answer(201);
      vi.stubGlobal('fetch', fetch);

      expect(await submitScore({ runId: RUN_ID, nick: 'MMK', score: 97, seconds: 20 })).toBe(
         'saved',
      );
      const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/public\/runner-scores$/);
      expect(init.method).toBe('POST');
      expect(init.keepalive).toBe(true);
      expect(JSON.parse(init.body as string)).toEqual({
         runId: RUN_ID,
         nick: 'MMK',
         score: 97,
         seconds: 20,
      });
   });

   it('tells a refused score, too many tries and no answer apart', async () => {
      vi.stubGlobal('fetch', answer(400));
      expect(await submitScore({ runId: RUN_ID, nick: 'MMK', score: 1, seconds: 1 })).toBe(
         'rejected',
      );
      vi.stubGlobal('fetch', answer(429));
      expect(await submitScore({ runId: RUN_ID, nick: 'MMK', score: 1, seconds: 1 })).toBe(
         'limited',
      );
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
      expect(await submitScore({ runId: RUN_ID, nick: 'MMK', score: 1, seconds: 1 })).toBe(
         'failed',
      );
   });
});

describe('reading the leaderboard', () => {
   afterEach(() => vi.unstubAllGlobals());

   it('reads the best players from the top endpoint', async () => {
      const players = [
         { nick: 'MMK', score: 812 },
         { nick: 'ABC', score: 400 },
      ];
      const fetch = vi
         .fn()
         .mockResolvedValue({ ok: true, json: () => Promise.resolve({ players }) });
      vi.stubGlobal('fetch', fetch);
      expect(await fetchTopPlayers()).toEqual(players);
      expect(fetch.mock.calls[0][0]).toMatch(/\/public\/runner-scores\/top$/);
   });

   it('knows nothing when the scoreboard cannot be read', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      expect(await fetchTopPlayers()).toBeUndefined();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
      expect(await fetchTopPlayers()).toBeUndefined();
   });
});

describe('the leaderboard with this run', () => {
   const top = Array.from({ length: 10 }, (_, i) => ({ nick: `P${i}0`, score: 1000 - i * 100 }));

   it('puts a run that makes the top in its place, after equal scores', () => {
      const rows = leaderboardRows(top, { nick: 'MMK', score: 800 });

      expect(rows).toHaveLength(10);
      expect(rows[3]).toEqual({ nick: 'MMK', score: 800, pending: true, rank: 4 });
      expect(rows[2]).toMatchObject({ nick: 'P20', rank: 3 });
      expect(rows.at(-1)).toMatchObject({ nick: 'P80', rank: 10 });
   });

   it('stands below the same name when their best is higher, as the rank says', () => {
      const rows = leaderboardRows([{ nick: 'MAR', score: 296 }], { nick: 'MAR', score: 1 });

      expect(rows).toEqual([
         { nick: 'MAR', score: 296, rank: 1 },
         { nick: 'MAR', score: 1, pending: true, rank: 2 },
      ]);
   });

   it('keeps the lower run of the same name when the new one beats it: a name can stand twice', () => {
      const rows = leaderboardRows(top, { nick: 'P50', score: 750 });

      expect(rows.filter((row) => row.nick === 'P50')).toEqual([
         { nick: 'P50', score: 750, pending: true, rank: 4 },
         { nick: 'P50', score: 500, rank: 7 },
      ]);
      expect(rows).toHaveLength(10);
   });

   it('lets one player fill the whole top, each row with its own rank', () => {
      const own = Array.from({ length: 10 }, (_, i) => ({ nick: 'MMK', score: 1000 - i * 10 }));

      const rows = leaderboardRows(own, { nick: 'MMK', score: 955 });

      expect(rows.map((row) => [row.nick, row.score, row.rank])).toEqual([
         ['MMK', 1000, 1],
         ['MMK', 990, 2],
         ['MMK', 980, 3],
         ['MMK', 970, 4],
         ['MMK', 960, 5],
         ['MMK', 955, 6],
         ['MMK', 950, 7],
         ['MMK', 940, 8],
         ['MMK', 930, 9],
         ['MMK', 920, 10],
      ]);
      expect(new Set(rows.map((row) => `${row.rank}-${row.nick}`)).size).toBe(rows.length);
   });

   it('shows a run below the top after it, with its rank from the scoreboard', () => {
      const rows = leaderboardRows(top, { nick: 'MMK', score: 12 }, 37);

      expect(rows).toHaveLength(11);
      expect(rows.slice(0, 10).every((row) => !row.pending)).toBe(true);
      expect(rows[10]).toEqual({ nick: 'MMK', score: 12, pending: true, rank: 37 });
   });

   it('shows the run alone on an empty leaderboard', () => {
      expect(leaderboardRows([], { nick: '???', score: 3 })).toEqual([
         { nick: '???', score: 3, pending: true, rank: 1 },
      ]);
   });
});

describe('reading the rank', () => {
   afterEach(() => vi.unstubAllGlobals());

   it('asks for the score', async () => {
      const fetch = vi
         .fn()
         .mockResolvedValue({ ok: true, json: () => Promise.resolve({ rank: 37 }) });
      vi.stubGlobal('fetch', fetch);

      expect(await fetchRank(12)).toBe(37);
      expect(fetch.mock.calls[0][0]).toMatch(/\/public\/runner-scores\/rank\?score=12$/);
   });

   it('knows nothing when it cannot be read', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
      expect(await fetchRank(12)).toBeUndefined();
   });
});
