import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import type { AuthService } from '@/auth/auth.service';
import type { UserInvitationService } from '@/user/user-invitation.service';

import { EMAIL_JOB_INVITATION, EMAIL_JOB_PASSWORD_RESET, EMAIL_JOB_SEND } from '../email.constants';
import { EmailProcessor } from '../email.processor';
import type { EmailService } from '../email.service';
import type { EmailJobData } from '../email.types';

describe('EmailProcessor', () => {
   const message = { to: 'user@test.com', subject: 's', body: 'https://admin/link/token' };
   const buildJob = (name: string, data: EmailJobData): Job<EmailJobData> =>
      ({ id: '1', name, data }) as Job<EmailJobData>;

   let emailService: { sendEmail: jest.Mock };
   let authService: { createPasswordResetEmail: jest.Mock };
   let invitations: { createInvitationEmail: jest.Mock };
   let processor: EmailProcessor;

   beforeEach(() => {
      emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
      authService = { createPasswordResetEmail: jest.fn().mockResolvedValue(message) };
      invitations = { createInvitationEmail: jest.fn().mockResolvedValue(message) };
      processor = new EmailProcessor(
         emailService as unknown as EmailService,
         authService as unknown as AuthService,
         invitations as unknown as UserInvitationService,
      );
   });

   afterEach(() => jest.restoreAllMocks());

   it('builds the reset email from the user id and sends it', async () => {
      await processor.process(buildJob(EMAIL_JOB_PASSWORD_RESET, { userId: 7 }));

      expect(authService.createPasswordResetEmail).toHaveBeenCalledWith(7);
      expect(emailService.sendEmail).toHaveBeenCalledWith(message);
   });

   it('builds the invitation email for the invitation of the job and sends it', async () => {
      const invitedAt = '2026-11-12T10:00:00.000Z';

      await processor.process(buildJob(EMAIL_JOB_INVITATION, { userId: 7, invitedAt }));

      expect(invitations.createInvitationEmail).toHaveBeenCalledWith(7, invitedAt);
      expect(emailService.sendEmail).toHaveBeenCalledWith(message);
   });

   it('sends nothing when the user no longer gets the email', async () => {
      authService.createPasswordResetEmail.mockResolvedValue(null);

      await processor.process(buildJob(EMAIL_JOB_PASSWORD_RESET, { userId: 7 }));

      expect(emailService.sendEmail).not.toHaveBeenCalled();
   });

   it('still sends a `send` job with a ready message as it is', async () => {
      await processor.process(buildJob(EMAIL_JOB_SEND, message));

      expect(emailService.sendEmail).toHaveBeenCalledWith(message);
   });

   it('fails a job with an unknown name so that BullMQ retries it', async () => {
      await expect(processor.process(buildJob('bogus', { userId: 7 }))).rejects.toThrow('bogus');
      expect(emailService.sendEmail).not.toHaveBeenCalled();
   });

   it('logs the job without the address or the link', async () => {
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await processor.process(buildJob(EMAIL_JOB_SEND, message));
      await processor.process(buildJob(EMAIL_JOB_PASSWORD_RESET, { userId: 7 }));

      expect(log).toHaveBeenCalled();
      for (const [line] of log.mock.calls) {
         expect(line).not.toContain(message.to);
         expect(line).not.toContain(message.body);
      }
   });

   it('lets thrown service errors propagate so BullMQ records the failed attempt', async () => {
      const boom = new Error('SMTP refused');
      emailService.sendEmail.mockRejectedValueOnce(boom);
      await expect(
         processor.process(buildJob(EMAIL_JOB_PASSWORD_RESET, { userId: 7 })),
      ).rejects.toBe(boom);
   });
});
