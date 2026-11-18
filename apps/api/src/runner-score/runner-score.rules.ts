const MIN_POINTS_PER_SECOND = 1;

export const MAX_POINTS_PER_SECOND = 6;
const MAX_POINTS_ANY_RUN = 100;
const PEAK_POINTS_PER_SECOND = 7;
const MAX_POINTS_AT_START = 20;

export function maxPlausibleScore(seconds: number): number {
   return Math.min(
      seconds * MAX_POINTS_PER_SECOND + MAX_POINTS_ANY_RUN,
      seconds * PEAK_POINTS_PER_SECOND + MAX_POINTS_AT_START,
   );
}

export function isPlausibleScore({ score, seconds }: { score: number; seconds: number }): boolean {
   return score >= seconds * MIN_POINTS_PER_SECOND && score <= maxPlausibleScore(seconds);
}

export const MIN_KEPT_RUN_SECONDS = 5;

export function isWorthKeeping({ seconds }: { seconds: number }): boolean {
   return seconds >= MIN_KEPT_RUN_SECONDS;
}

export const LEADERBOARD_SIZE = 10;

export const MAX_KEPT_RUNS_PER_DAY = 2000;
export const MAX_KEPT_RUNS_PER_IP_PER_DAY = 200;
export const MAX_LEADERBOARD_RUNS_OVER_CAP_PER_DAY = 100;
export const KEPT_RUNS_WINDOW_SECONDS = 24 * 60 * 60;

export function scoreEntersLeaderboard(score: number, players: { score: number }[]): boolean {
   const last = players[LEADERBOARD_SIZE - 1];
   return !last || score > last.score;
}

export const PROTECTED_BEST_RUNS = 999;
const MIN_VISIBLE_RUNS_AFTER_CLEANUP = PROTECTED_BEST_RUNS;
const MAX_VISIBLE_RUNS = 50_000;
const MAX_DELETED_PER_CLEANUP = 50_000;
const CLEANUP_BATCH_SIZE = 1000;
export const SCORE_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 7;
export const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export const MAX_RANK_COUNTED = MAX_VISIBLE_RUNS;

export type CleanupLimits = {
   protectedBestRuns: number;
   minVisibleRunsAfter: number;
   maxVisibleRuns: number;
   maxDeletedPerRun: number;
   batchSize: number;
   retentionDays: number;
};

export const CLEANUP_LIMITS: CleanupLimits = {
   protectedBestRuns: PROTECTED_BEST_RUNS,
   minVisibleRunsAfter: MIN_VISIBLE_RUNS_AFTER_CLEANUP,
   maxVisibleRuns: MAX_VISIBLE_RUNS,
   maxDeletedPerRun: MAX_DELETED_PER_CLEANUP,
   batchSize: CLEANUP_BATCH_SIZE,
   retentionDays: SCORE_RETENTION_DAYS,
};

export function cleanupLimitProblems(limits: CleanupLimits): string[] {
   const problems: string[] = [];
   const isCount = (value: number) => Number.isInteger(value) && value > 0;
   for (const [name, value] of Object.entries(limits)) {
      if (!isCount(value)) problems.push(`${name} must be a positive integer, got ${value}`);
   }
   if (limits.protectedBestRuns < LEADERBOARD_SIZE) {
      problems.push(`protectedBestRuns must cover the leaderboard (${LEADERBOARD_SIZE})`);
   }
   if (limits.minVisibleRunsAfter < limits.protectedBestRuns) {
      problems.push('minVisibleRunsAfter must be at least protectedBestRuns');
   }
   if (limits.maxVisibleRuns < limits.minVisibleRunsAfter) {
      problems.push('maxVisibleRuns must be at least minVisibleRunsAfter');
   }
   if (limits.batchSize > limits.maxDeletedPerRun) {
      problems.push('batchSize must not be larger than maxDeletedPerRun');
   }
   if (limits.retentionDays < MIN_RETENTION_DAYS) {
      problems.push(`retentionDays must be at least ${MIN_RETENTION_DAYS}`);
   }
   return problems;
}

export function assertCleanupLimits(limits: CleanupLimits): void {
   const problems = cleanupLimitProblems(limits);
   if (problems.length > 0) {
      throw new Error(`Unsafe runner score cleanup limits: ${problems.join('; ')}`);
   }
}

assertCleanupLimits(CLEANUP_LIMITS);
