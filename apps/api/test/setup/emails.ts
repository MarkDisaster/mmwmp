import { getQueueToken } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { EMAIL_QUEUE } from '../../src/email/email.constants';
import { EmailProcessor } from '../../src/email/email.processor';
import { EmailService } from '../../src/email/email.service';
import { getApp } from './init';

export const getEmailQueue = () => getApp().get<Queue>(getQueueToken(EMAIL_QUEUE));

let sent: jest.SpyInstance | undefined;

export const emailsSent = async (count = 1, timeoutMs = 5000) => {
   const deadline = Date.now() + timeoutMs;
   while ((sent?.mock.calls.length ?? 0) < count) {
      if (Date.now() > deadline) throw new Error(`Expected ${count} email(s) to be sent`);
      await new Promise((resolve) => setTimeout(resolve, 10));
   }
};

export const captureEmails = (): jest.SpyInstance => {
   sent = jest
      .spyOn(getApp().get(EmailService), 'sendEmail')
      .mockResolvedValue({ data: null, error: null } as never);
   jest.spyOn(getEmailQueue(), 'add').mockImplementation(async (name, data) => {
      const job = { id: 'e2e', name, data } as Job;
      await getApp().get(EmailProcessor).process(job);
      return job;
   });
   return sent;
};
