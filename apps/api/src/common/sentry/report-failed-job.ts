import { captureException } from '@sentry/nestjs';
import type { Job } from 'bullmq';

export const reportFailedJob = (job: Job | undefined, error: Error) => {
   if (!job?.finishedOn) return;
   captureException(error, {
      tags: { queue: job.queueName, job: job.name },
      extra: { jobId: job.id, attemptsMade: job.attemptsMade },
   });
};
