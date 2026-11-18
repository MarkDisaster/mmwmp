import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
   EMAIL_JOB_INVITATION,
   EMAIL_JOB_PASSWORD_RESET,
   EMAIL_JOB_SEND,
   EMAIL_QUEUE,
} from './email.constants';
import type { EmailJobData, EmailMessage } from './email.types';

@Injectable()
export class EmailQueue {
   constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailJobData>) {}

   async send(message: EmailMessage): Promise<void> {
      await this.add(EMAIL_JOB_SEND, message);
   }

   async sendPasswordReset(userId: number): Promise<void> {
      await this.add(EMAIL_JOB_PASSWORD_RESET, { userId });
   }

   async sendInvitation(userId: number, invitedAt: Date): Promise<void> {
      await this.add(EMAIL_JOB_INVITATION, { userId, invitedAt: invitedAt.toISOString() });
   }

   private async add(name: string, data: EmailJobData): Promise<void> {
      await this.queue.add(name, data, {
         attempts: 3,
         backoff: { type: 'exponential', delay: 2000 },
      });
   }
}
