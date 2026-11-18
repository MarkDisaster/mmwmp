import type { Queue } from 'bullmq';

import { EMAIL_JOB_INVITATION, EMAIL_JOB_PASSWORD_RESET, EMAIL_JOB_SEND } from '../email.constants';
import { EmailQueue } from '../email.queue';
import type { EmailJobData } from '../email.types';

describe('EmailQueue', () => {
   const retries = { attempts: 3, backoff: { type: 'exponential', delay: 2000 } };

   let queue: { add: jest.Mock };
   let producer: EmailQueue;

   beforeEach(() => {
      queue = { add: jest.fn().mockResolvedValue(undefined) };
      producer = new EmailQueue(queue as unknown as Queue<EmailJobData>);
   });

   it('enqueues a legacy `send` job with the ready message', async () => {
      const message = { to: 'user@example.com', subject: 'hi', body: 'body' };

      await producer.send(message);

      expect(queue.add).toHaveBeenCalledWith(EMAIL_JOB_SEND, message, retries);
   });

   it('enqueues a `password-reset` job with only the user id', async () => {
      await producer.sendPasswordReset(7);

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(EMAIL_JOB_PASSWORD_RESET, { userId: 7 }, retries);
   });

   it('enqueues an `invitation` job with the user id and the time of the invitation', async () => {
      await producer.sendInvitation(7, new Date('2026-11-12T10:00:00.000Z'));

      expect(queue.add).toHaveBeenCalledWith(
         EMAIL_JOB_INVITATION,
         { userId: 7, invitedAt: '2026-11-12T10:00:00.000Z' },
         retries,
      );
   });
});
