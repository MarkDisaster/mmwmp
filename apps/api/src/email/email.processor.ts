import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { AuthService } from '@/auth/auth.service';
import { ReportingWorkerHost } from '@/common/sentry/reporting-worker-host';
import { IDLE_WORKER_OPTIONS } from '@/queue/queue.constants';
import { UserInvitationService } from '@/user/user-invitation.service';

import {
   EMAIL_JOB_INVITATION,
   EMAIL_JOB_PASSWORD_RESET,
   EMAIL_JOB_SEND,
   EMAIL_QUEUE,
} from './email.constants';
import { EmailService } from './email.service';
import type {
   EmailJobData,
   EmailMessage,
   InvitationJobData,
   PasswordResetJobData,
   SendEmailJobData,
} from './email.types';

@Processor(EMAIL_QUEUE, IDLE_WORKER_OPTIONS)
export class EmailProcessor extends ReportingWorkerHost {
   private readonly logger = new Logger(EmailProcessor.name);

   constructor(
      private readonly emailService: EmailService,
      private readonly authService: AuthService,
      private readonly userInvitationService: UserInvitationService,
   ) {
      super();
   }

   async process(job: Job<EmailJobData>): Promise<void> {
      const message = await this.createMessage(job);
      if (!message) {
         this.logger.log(`Email job ${job.id} (${job.name}) skipped, nothing to send`);
         return;
      }

      this.logger.log(`Processing email job ${job.id} (${job.name})`);
      await this.emailService.sendEmail(message);
   }

   private async createMessage(job: Job<EmailJobData>): Promise<EmailMessage | null> {
      switch (job.name) {
         case EMAIL_JOB_PASSWORD_RESET: {
            const { userId } = job.data as PasswordResetJobData;
            return this.authService.createPasswordResetEmail(userId);
         }
         case EMAIL_JOB_INVITATION: {
            const { userId, invitedAt } = job.data as InvitationJobData;
            return this.userInvitationService.createInvitationEmail(userId, invitedAt);
         }
         case EMAIL_JOB_SEND:
            return job.data as SendEmailJobData;
         default:
            throw new Error(`Unknown email job name "${job.name}"`);
      }
   }
}
