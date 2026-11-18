import {
   assertCleanupLimits,
   CLEANUP_LIMITS,
   cleanupLimitProblems,
   isPlausibleScore,
   isWorthKeeping,
   LEADERBOARD_SIZE,
   MAX_KEPT_RUNS_PER_DAY,
   MAX_KEPT_RUNS_PER_IP_PER_DAY,
   MAX_RANK_COUNTED,
   maxPlausibleScore,
   MIN_KEPT_RUN_SECONDS,
   PROTECTED_BEST_RUNS,
   SCORE_RETENTION_DAYS,
   scoreEntersLeaderboard,
} from '../runner-score.rules';

describe('runner score rules', () => {
   describe('maxPlausibleScore', () => {
      it('allows 7 points a second plus 20 at the start of a run', () => {
         expect(maxPlausibleScore(0)).toBe(20);
         expect(maxPlausibleScore(10)).toBe(90);
         expect(maxPlausibleScore(60)).toBe(440);
      });

      it('allows 6 points a second plus 100 once a run is longer than 80 s', () => {
         expect(maxPlausibleScore(80)).toBe(580);
         expect(maxPlausibleScore(300)).toBe(1900);
         expect(maxPlausibleScore(900)).toBe(5500);
      });

      it.each([
         [60, 395],
         [120, 768],
         [171, 6 * 171 + 76],
         [300, 1796],
         [899, 5113],
      ])('stays above the measured best of a %i s run (%i points)', (seconds, best) => {
         expect(maxPlausibleScore(seconds)).toBeGreaterThanOrEqual(best);
      });
   });

   describe('isPlausibleScore', () => {
      it('accepts a run between a point a second and the bound', () => {
         expect(isPlausibleScore({ score: 12, seconds: 12 })).toBe(true);
         expect(isPlausibleScore({ score: 1186, seconds: 300 })).toBe(true);
         expect(isPlausibleScore({ score: 1900, seconds: 300 })).toBe(true);
         expect(isPlausibleScore({ score: 0, seconds: 0 })).toBe(true);
      });

      it('refuses fewer points than seconds: the game gives one for every second', () => {
         expect(isPlausibleScore({ score: 11, seconds: 12 })).toBe(false);
         expect(isPlausibleScore({ score: 0, seconds: 300 })).toBe(false);
      });

      it('refuses more points than the time played can give', () => {
         expect(isPlausibleScore({ score: 1901, seconds: 300 })).toBe(false);
         expect(isPlausibleScore({ score: 21, seconds: 0 })).toBe(false);
         expect(isPlausibleScore({ score: 100, seconds: 2 })).toBe(false);
      });
   });

   describe('isWorthKeeping', () => {
      it(`keeps a run of ${MIN_KEPT_RUN_SECONDS} s or longer`, () => {
         expect(isWorthKeeping({ seconds: MIN_KEPT_RUN_SECONDS })).toBe(true);
         expect(isWorthKeeping({ seconds: 300 })).toBe(true);
      });

      it('drops a shorter run', () => {
         expect(isWorthKeeping({ seconds: 0 })).toBe(false);
         expect(isWorthKeeping({ seconds: MIN_KEPT_RUN_SECONDS - 1 })).toBe(false);
      });
   });

   describe('scoreEntersLeaderboard', () => {
      const top = (lowest: number, length = LEADERBOARD_SIZE) =>
         Array.from({ length }, (_, i) => ({ score: lowest + (length - 1 - i) * 10 }));

      it('lets in a score above the tenth place', () => {
         expect(scoreEntersLeaderboard(501, top(500))).toBe(true);
      });

      it('keeps out a score equal to the tenth place or below: an equal one stands after', () => {
         expect(scoreEntersLeaderboard(500, top(500))).toBe(false);
         expect(scoreEntersLeaderboard(10, top(500))).toBe(false);
      });

      it('lets in any score while the leaderboard is not full', () => {
         expect(scoreEntersLeaderboard(0, [])).toBe(true);
         expect(scoreEntersLeaderboard(1, top(500, LEADERBOARD_SIZE - 1))).toBe(true);
      });
   });

   describe('stored runs', () => {
      it('take at least ten addresses to use up the number for all players', () => {
         expect(MAX_KEPT_RUNS_PER_DAY / MAX_KEPT_RUNS_PER_IP_PER_DAY).toBeGreaterThanOrEqual(10);
      });

      it('are ranked exactly over every run the cleanup keeps', () => {
         expect(MAX_RANK_COUNTED).toBeGreaterThanOrEqual(CLEANUP_LIMITS.maxVisibleRuns);
      });
   });

   describe('cleanup limits', () => {
      it('protects the 999 best runs, more than the leaderboard shows, and keeps as many', () => {
         expect(PROTECTED_BEST_RUNS).toBe(999);
         expect(PROTECTED_BEST_RUNS).toBeGreaterThanOrEqual(LEADERBOARD_SIZE);
      });

      it('are safe as configured: the module would not load otherwise', () => {
         expect(SCORE_RETENTION_DAYS).toBeGreaterThanOrEqual(7);
         expect(cleanupLimitProblems(CLEANUP_LIMITS)).toEqual([]);
         expect(() => assertCleanupLimits(CLEANUP_LIMITS)).not.toThrow();
      });

      it.each([
         ['a retention under 7 days', { retentionDays: 6 }],
         ['no retention', { retentionDays: 0 }],
         ['a negative retention, a cutoff in the future', { retentionDays: -30 }],
         ['fewer protected runs than the leaderboard', { protectedBestRuns: 9 }],
         ['a floor under the protected runs', { minVisibleRunsAfter: 998 }],
         ['a batch larger than the cap', { batchSize: 60_000 }],
         ['a fractional cap', { maxDeletedPerRun: 10.5 }],
         ['no cap', { maxDeletedPerRun: 0 }],
         ['fewer visible runs kept than the floor', { maxVisibleRuns: 998 }],
         ['no bound on visible runs', { maxVisibleRuns: 0 }],
      ])('refuse %s', (_name, change) => {
         const limits = { ...CLEANUP_LIMITS, ...change };

         expect(cleanupLimitProblems(limits)).not.toEqual([]);
         expect(() => assertCleanupLimits(limits)).toThrow(/Unsafe runner score cleanup limits/);
      });
   });
});
