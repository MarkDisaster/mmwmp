import { captureException } from '@sentry/nestjs';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';

import { reportFailedJob } from '../report-failed-job';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

const job = ({ finishedOn, attemptsMade = 1, attempts = 3 }: Partial<Record<string, number>>) =>
   ({
      id: '7',
      name: 'send',
      queueName: 'email',
      attemptsMade,
      finishedOn,
      opts: { attempts },
      data: { to: 'jana@example.cz' },
   }) as unknown as Job;

const FINISHED_ON = 1_700_000_000_000;

describe('reportFailedJob', () => {
   afterEach(() => jest.mocked(captureException).mockClear());

   it('does not report an attempt that will be retried', () => {
      reportFailedJob(job({ attemptsMade: 1, attempts: 3 }), new Error('boom'));
      expect(captureException).not.toHaveBeenCalled();
   });

   it('reports the last attempt with the queue and the job, without the data of the job', () => {
      const error = new Error('boom');
      reportFailedJob(job({ attemptsMade: 3, attempts: 3, finishedOn: FINISHED_ON }), error);
      expect(captureException).toHaveBeenCalledTimes(1);
      const [reported, context] = jest.mocked(captureException).mock.calls[0];
      expect(reported).toBe(error);
      expect(JSON.stringify(context)).not.toContain('jana@example.cz');
      expect(context).toMatchObject({ tags: { queue: 'email', job: 'send' } });
   });

   it('reports a job with a single attempt', () => {
      reportFailedJob(
         job({ attemptsMade: 1, attempts: 1, finishedOn: FINISHED_ON }),
         new Error('boom'),
      );
      expect(captureException).toHaveBeenCalledTimes(1);
   });

   it('reports a job ended early by an UnrecoverableError', () => {
      const error = new UnrecoverableError('boom');
      reportFailedJob(job({ attemptsMade: 1, attempts: 3, finishedOn: FINISHED_ON }), error);
      expect(captureException).toHaveBeenCalledWith(error, expect.anything());
   });

   it('ignores a failure without a job', () => {
      reportFailedJob(undefined, new Error('boom'));
      expect(captureException).not.toHaveBeenCalled();
   });
});
