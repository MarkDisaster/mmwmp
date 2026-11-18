import { ON_WORKER_EVENT_METADATA } from '@nestjs/bullmq/dist/bull.constants';
import { MetadataScanner } from '@nestjs/core';
import type { Job } from 'bullmq';

import { reportFailedJob } from '../report-failed-job';
import { ReportingWorkerHost } from '../reporting-worker-host';

jest.mock('../report-failed-job', () => ({ reportFailedJob: jest.fn() }));

class TestProcessor extends ReportingWorkerHost {
   async process(): Promise<void> {}
}

describe('ReportingWorkerHost', () => {
   it('reports a failed job', () => {
      const job = { id: '1' } as Job;
      const error = new Error('boom');
      new TestProcessor().onFailed(job, error);
      expect(reportFailedJob).toHaveBeenCalledWith(job, error);
   });

   it('registers the failed handler of a subclass as a worker event', () => {
      const instance = new TestProcessor();
      const events = new MetadataScanner().scanFromPrototype(
         instance,
         Object.getPrototypeOf(instance),
         (key) =>
            Reflect.getMetadata(ON_WORKER_EVENT_METADATA, instance[key as keyof TestProcessor]),
      );
      expect(events).toEqual([{ eventName: 'failed' }]);
   });
});
