import pg from 'pg';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { captureEmails, emailsSent } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { startRequest, waitForLockWait } from '../../setup/locks';
import { createAdminAndLogin, createTestUser, getRoleId, TEST_PASSWORD } from '../../setup/users';

type Tokens = { accessToken: string; refreshToken: string };

describe('Session revocation and single-use reset links (e2e)', () => {
   let prisma: PrismaService;
   let queued: jest.SpyInstance;

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
      queued = captureEmails();
   });
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   const login = async (email: string, password = TEST_PASSWORD): Promise<Tokens> => {
      const response = await getHttpServer().post('/auth/login').send({ email, password });
      expect(response.status).toBe(201);
      return response.body;
   };

   const refresh = (refreshToken: string) =>
      getHttpServer().post('/auth/refresh').send({ refreshToken });

   const me = (accessToken: string) =>
      getHttpServer().get('/users/me').set('Authorization', `Bearer ${accessToken}`);

   const requestResetToken = async (email: string) => {
      queued.mockClear();
      const response = await getHttpServer().post('/auth/forgot-password').send({ email });
      expect(response.status).toBe(200);
      await emailsSent();
      expect(queued).toHaveBeenCalledTimes(1);
      const [{ body }] = queued.mock.calls[0] as [{ body: string }];
      const token = /reset-password\/([^\s]+)/.exec(body)?.[1];
      if (!token) throw new Error('No reset link in the queued email');
      return token;
   };

   const reset = (token: string, newPassword = 'new-password-123') =>
      getHttpServer().post('/auth/reset-password').send({ token, newPassword });

   describe('password reset', () => {
      it('should end every session and work only once', async () => {
         await createTestUser({ email: 'user@test.com', role: 'editor' });
         const session = await login('user@test.com');
         const token = await requestResetToken('user@test.com');

         const first = await reset(token);
         const second = await reset(token, 'another-password-123');

         expect(first.status).toBe(200);
         expect(second.status).toBe(400);
         expect((await refresh(session.refreshToken)).status).toBe(401);
         expect((await me(session.accessToken)).status).toBe(401);
         expect(
            (
               await getHttpServer()
                  .post('/auth/login')
                  .send({ email: 'user@test.com', password: 'new-password-123' })
            ).status,
         ).toBe(201);
      });

      it('should let only one of two concurrent resets with the same link through', async () => {
         await createTestUser({ email: 'user@test.com', role: 'editor' });
         const token = await requestResetToken('user@test.com');

         const statuses = (
            await Promise.all([reset(token, 'first-password-1'), reset(token, 'second-password-2')])
         )
            .map((response) => response.status)
            .sort();

         expect(statuses).toEqual([200, 400]);
      });

      it('should invalidate an older link once the password changed in another way', async () => {
         await createTestUser({ email: 'user@test.com', role: 'editor' });
         const oldToken = await requestResetToken('user@test.com');
         const newToken = await requestResetToken('user@test.com');

         expect((await reset(newToken)).status).toBe(200);
         expect((await reset(oldToken, 'yet-another-password')).status).toBe(400);
      });

      it('should send no link to an unknown email or a pending invitation', async () => {
         await prisma.user.create({
            data: {
               email: 'pending@test.com',
               firstName: '',
               lastName: '',
               roleId: await getRoleId('editor'),
               invitedAt: new Date(),
            },
         });

         for (const email of ['nobody@test.com', 'pending@test.com']) {
            const response = await getHttpServer().post('/auth/forgot-password').send({ email });
            expect(response.status).toBe(200);
         }
         await new Promise((resolve) => setImmediate(resolve));
         expect(queued).not.toHaveBeenCalled();
      });
   });

   describe('own password change', () => {
      it('should end every session of the user, the current one too', async () => {
         await createTestUser({ email: 'user@test.com', role: 'editor' });
         const current = await login('user@test.com');
         const other = await login('user@test.com');

         const change = await getHttpServer()
            .patch('/users/me/password')
            .set('Authorization', `Bearer ${current.accessToken}`)
            .send({ currentPassword: TEST_PASSWORD, newPassword: 'changed-password-1' });

         expect(change.status).toBe(204);
         expect((await me(current.accessToken)).status).toBe(401);
         expect((await me(other.accessToken)).status).toBe(401);
         expect((await refresh(current.refreshToken)).status).toBe(401);
         expect((await refresh(other.refreshToken)).status).toBe(401);
         const fresh = await login('user@test.com', 'changed-password-1');
         expect((await me(fresh.accessToken)).status).toBe(200);
      });
   });

   describe('deleted users', () => {
      it('should refuse a refresh token of a deleted user even when it was not revoked', async () => {
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const session = await login('user@test.com');
         await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });

         expect((await refresh(session.refreshToken)).status).toBe(401);
      });

      it('should not bring the old sessions back when the account is created again', async () => {
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const session = await login('user@test.com');
         await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
         const adminToken = await createAdminAndLogin();

         const recreated = await getHttpServer()
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
               email: 'user@test.com',
               firstName: 'Back',
               lastName: 'Again',
               password: 'password456',
               roleId: await getRoleId('editor'),
            });

         expect(recreated.status).toBe(201);
         expect(recreated.body.id).toBe(user.id);
         expect((await refresh(session.refreshToken)).status).toBe(401);
      });

      it('should invite a deleted user again instead of failing with 500', async () => {
         const user = await createTestUser({ email: 'user@test.com', role: 'editor' });
         const session = await login('user@test.com');
         await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
         const adminToken = await createAdminAndLogin();

         const invited = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'user@test.com', roleId: await getRoleId('editor') });

         expect(invited.status).toBe(201);
         expect(invited.body.id).toBe(user.id);
         const stored = await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            include: { auth: true },
         });
         expect(stored).toMatchObject({ deletedAt: null, acceptedInvitationAt: null, auth: null });
         expect((await refresh(session.refreshToken)).status).toBe(401);
         expect(
            (
               await getHttpServer()
                  .post('/auth/login')
                  .send({ email: 'user@test.com', password: TEST_PASSWORD })
            ).status,
         ).toBe(401);

         const [{ body }] = queued.mock.calls.at(-1) as [{ body: string }];
         const token = /invitation\/([^\s]+)/.exec(body)?.[1] ?? '';
         const accept = (password: string) =>
            getHttpServer()
               .post(`/users/invitations/${token}/accept`)
               .send({ firstName: 'Back', lastName: 'Again', password });
         expect((await accept('password789')).status).toBe(201);
         expect((await accept('password000')).status).toBe(400);
      });
   });

   describe('invitation links', () => {
      it('should accept only the latest link after a resend', async () => {
         const adminToken = await createAdminAndLogin();
         const invited = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'invitee@test.com', roleId: await getRoleId('editor') });
         const linkOf = (call: number) => {
            const [{ body }] = queued.mock.calls[call] as [{ body: string }];
            return /invitation\/([^\s]+)/.exec(body)?.[1] ?? '';
         };
         const first = linkOf(0);

         await new Promise((resolve) => setTimeout(resolve, 1100));
         await getHttpServer()
            .post(`/users/${invited.body.id}/resend-invitation`)
            .set('Authorization', `Bearer ${adminToken}`);
         const second = linkOf(1);

         expect((await getHttpServer().head(`/users/invitations/${first}`)).status).toBe(400);
         expect((await getHttpServer().head(`/users/invitations/${second}`)).status).toBe(200);
      });
   });

   describe('refresh and a concurrent password change', () => {
      it('should not issue a new token to a session that a password change ends meanwhile', async () => {
         const user = await createTestUser();
         const session = await login(user.email);
         const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
         await client.connect();
         await client.query('BEGIN');
         await client.query(`UPDATE auth SET password = 'changed' WHERE user_id = $1`, [user.id]);

         const request = startRequest(refresh(session.refreshToken));
         await waitForLockWait(prisma);
         expect(request.isSettled()).toBe(false);

         await client.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [
            user.id,
         ]);
         await client.query('COMMIT');
         await client.end();
         const response = await request.promise;

         expect(response.status).toBe(401);
         expect(await prisma.refreshToken.count({ where: { isRevoked: false } })).toBe(0);
      });

      it('should rotate the token and keep exactly one live token without a concurrent change', async () => {
         const user = await createTestUser();
         const session = await login(user.email);

         const response = await refresh(session.refreshToken);

         expect(response.status).toBe(201);
         expect(await prisma.refreshToken.count({ where: { isRevoked: false } })).toBe(1);
         expect((await refresh(session.refreshToken)).status).toBe(401);
      });
   });
});
