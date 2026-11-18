import type { Job } from 'bullmq';

import { EMAIL_JOB_SEND } from '../../../src/email/email.constants';
import { EmailProcessor } from '../../../src/email/email.processor';
import { EmailQueue } from '../../../src/email/email.queue';
import { EmailService } from '../../../src/email/email.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getEmailQueue } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser } from '../../setup/users';

describe('Email jobs (e2e)', () => {
   let prisma: PrismaService;
   let added: jest.SpyInstance;
   let sent: jest.SpyInstance;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      added = jest.spyOn(getEmailQueue(), 'add').mockResolvedValue({} as Job);
      sent = jest
         .spyOn(getApp().get(EmailService), 'sendEmail')
         .mockResolvedValue({ data: null, error: null } as never);
   });
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   const lastJob = () => {
      const [name, data] = added.mock.calls.at(-1) as [string, unknown];
      return { id: 'e2e', name, data } as Job;
   };

   const runWorker = async (job: Job) => getApp().get(EmailProcessor).process(job);

   const sentEmail = () => (sent.mock.calls[0] as [{ to: string; body: string }])[0];

   const linkToken = (body: string, path: string) =>
      new RegExp(`${path}/([^\\s]+)`).exec(body)?.[1] ?? '';

   const queueReset = async (userId: number) => {
      await getApp().get(EmailQueue).sendPasswordReset(userId);
      return lastJob();
   };

   const createPendingUser = (invitedAt: Date) =>
      prisma.user.create({
         data: {
            email: 'invitee@test.com',
            firstName: '',
            lastName: '',
            role: { connect: { name: 'editor' } },
            invitedAt,
         },
      });

   const queueInvitation = async (userId: number, invitedAt: Date) => {
      await getApp().get(EmailQueue).sendInvitation(userId, invitedAt);
      return lastJob();
   };

   describe('password reset', () => {
      it('should hold no address and no link, the worker sends a working link', async () => {
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });

         const job = await queueReset(user.id);
         expect(JSON.stringify(job.data)).not.toMatch(/@|reset-password|http/);

         await runWorker(job);
         expect(sentEmail().to).toBe('user@test.com');
         const reset = await getHttpServer()
            .post('/auth/reset-password')
            .send({
               token: linkToken(sentEmail().body, 'reset-password'),
               newPassword: 'new-password-123',
            });
         expect(reset.status).toBe(200);
      });

      it.each([
         ['deactivated', { deactivatedAt: new Date() }],
         ['deleted', { deletedAt: new Date() }],
      ])('should not be sent to a user %s after it was queued', async (_label, change) => {
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const job = await queueReset(user.id);

         await prisma.user.update({ where: { id: user.id }, data: change });
         await runWorker(job);

         expect(sent).not.toHaveBeenCalled();
      });
   });

   describe('invitation', () => {
      it('should hold no address and no link, the worker sends a working link', async () => {
         const invitedAt = new Date();
         const user = await createPendingUser(invitedAt);

         const job = await queueInvitation(user.id, invitedAt);
         expect(JSON.stringify(job.data)).not.toMatch(/@|invitation\/|http/);

         await runWorker(job);
         expect(sentEmail().to).toBe('invitee@test.com');
         const check = await getHttpServer().head(
            `/users/invitations/${linkToken(sentEmail().body, 'invitation')}`,
         );
         expect(check.status).toBe(200);
      });

      it.each([
         ['invited again', { invitedAt: new Date(Date.now() + 1000) }],
         ['deactivated', { deactivatedAt: new Date() }],
         ['deleted', { deletedAt: new Date() }],
         ['accepted', { acceptedInvitationAt: new Date() }],
      ])('should not be sent to a user %s after it was queued', async (_label, change) => {
         const invitedAt = new Date();
         const user = await createPendingUser(invitedAt);
         const job = await queueInvitation(user.id, invitedAt);

         await prisma.user.update({ where: { id: user.id }, data: change });
         await runWorker(job);

         expect(sent).not.toHaveBeenCalled();
      });
   });

   it('should send a `send` job with a ready message as it is', async () => {
      const message = { to: 'user@test.com', subject: 'Password Reset', body: 'link' };

      await runWorker({ id: 'e2e', name: EMAIL_JOB_SEND, data: message } as Job);

      expect(sent).toHaveBeenCalledWith(message);
   });
});
