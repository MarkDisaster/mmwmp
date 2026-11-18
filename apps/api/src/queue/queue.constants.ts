import type { WorkerOptions } from 'bullmq';

export const IDLE_WORKER_OPTIONS = {
   drainDelay: 60,
   stalledInterval: 120_000,
} satisfies Pick<WorkerOptions, 'drainDelay' | 'stalledInterval'>;
