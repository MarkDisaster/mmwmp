export const TRASH_PURGE_QUEUE = 'trash-purge';
export const TRASH_PURGE_JOB = 'purge';
export const TRASH_PURGE_SCHEDULER = 'trash-purge-daily';
export const TRASH_PURGE_PATTERN = '15 4 * * *';

export type TrashPurgeLimits = { maxPerRun: number };

export const TRASH_PURGE_LIMITS: TrashPurgeLimits = { maxPerRun: 500 };
