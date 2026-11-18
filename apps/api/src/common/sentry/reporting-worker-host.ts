import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { reportFailedJob } from './report-failed-job';

export abstract class ReportingWorkerHost extends WorkerHost {
   @OnWorkerEvent('failed')
   onFailed(job: Job | undefined, error: Error) {
      reportFailedJob(job, error);
   }
}
