import { EmailQueue } from '../../../src/email/email.queue';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { InviteUserTool } from '../../../src/user/tools/invite-user.tool';
import { UpdateUserTool } from '../../../src/user/tools/update-user.tool';
import { captureEmails, emailsSent } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, getRoleId, TEST_PASSWORD } from '../../setup/users';

describe('Email of an account (e2e)', () => {
   let prisma: PrismaService;
   let editorRoleId: number;

   beforeAll(async () => {
      prisma = getApp().get(PrismaService);
      editorRoleId = await getRoleId('editor');
   });

   const cleanupDb = async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   it('should sign in with the email typed in another case and with spaces around it', async () => {
      await createTestUser({ email: 'jan.novak@firma.cz' });

      const response = await getHttpServer()
         .post('/auth/login')
         .send({ email: '  Jan.Novak@Firma.CZ ', password: TEST_PASSWORD });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
   });

   it('should send the reset link to the stored email when it is asked in another case', async () => {
      await createTestUser({ email: 'jan.novak@firma.cz' });
      const queued = captureEmails();

      const response = await getHttpServer()
         .post('/auth/forgot-password')
         .send({ email: 'JAN.NOVAK@firma.cz' });
      await emailsSent(1);

      expect(response.status).toBe(200);
      expect(queued).toHaveBeenCalledTimes(1);
      expect(queued.mock.calls[0][0]).toEqual(
         expect.objectContaining({ to: 'jan.novak@firma.cz' }),
      );
   });

   it('should store a created user in lower case and refuse the same email in another case', async () => {
      const token = await createAdminAndLogin();
      const create = (email: string) =>
         getHttpServer().post('/users').set('Authorization', `Bearer ${token}`).send({
            email,
            firstName: 'Jan',
            lastName: 'Novák',
            password: TEST_PASSWORD,
            roleId: editorRoleId,
         });

      const created = await create('Jan.Novak@Firma.cz');
      expect(created.status).toBe(201);
      expect(created.body.email).toBe('jan.novak@firma.cz');

      const duplicate = await create('jan.novak@firma.cz');
      expect(duplicate.status).toBe(409);
      expect(await prisma.user.count({ where: { email: 'jan.novak@firma.cz' } })).toBe(1);
   });

   describe('invitation', () => {
      const invite = (token: string, email: string) =>
         getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${token}`)
            .send({ email, roleId: editorRoleId });

      beforeEach(() => {
         jest.spyOn(getApp().get(EmailQueue), 'send').mockResolvedValue();
      });

      it('should store the invited email in lower case', async () => {
         const token = await createAdminAndLogin();

         const invited = await invite(token, 'New.User@Test.com');

         expect(invited.status).toBe(201);
         expect(invited.body.email).toBe('new.user@test.com');
      });

      it('should return 409 for an existing email in another case', async () => {
         const token = await createAdminAndLogin();
         await createTestUser({ email: 'new.user@test.com', role: 'editor' });

         const again = await invite(token, 'NEW.USER@test.com');

         expect(again.status).toBe(409);
      });
   });

   it('should refuse a change of email to another account in another case', async () => {
      const token = await createAdminAndLogin();
      await createTestUser({ email: 'taken@test.com', role: 'editor' });
      const other = await createTestUser({ email: 'other@test.com', role: 'editor' });

      const conflict = await getHttpServer()
         .patch(`/users/${other.id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ email: 'Taken@Test.com' });
      expect(conflict.status).toBe(409);

      const changed = await getHttpServer()
         .patch(`/users/${other.id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ email: 'Renamed@Test.com' });
      expect(changed.status).toBe(200);
      expect(changed.body.email).toBe('renamed@test.com');
   });

   it('should return 400 for an email set to null', async () => {
      const token = await createAdminAndLogin();
      const other = await createTestUser({ email: 'other@test.com', role: 'editor' });

      const response = await getHttpServer()
         .patch(`/users/${other.id}`)
         .set('Authorization', `Bearer ${token}`)
         .send({ email: null });

      expect(response.status).toBe(400);
   });

   describe('AI tools', () => {
      const adminContext = (id: number) => ({
         user: { id, role: { isAdmin: true, permissions: [] } },
         conversationId: 'conversation',
      });

      it('should store the email of an inviteUser call in lower case', async () => {
         const admin = await createTestUser();
         jest.spyOn(getApp().get(EmailQueue), 'send').mockResolvedValue();

         const result = await getApp()
            .get(InviteUserTool)
            .execute(adminContext(admin.id), { email: 'New.User@Test.com', roleId: editorRoleId });

         expect(result.email).toBe('new.user@test.com');
         await expect(
            prisma.user.findUnique({ where: { email: 'new.user@test.com' } }),
         ).resolves.not.toBeNull();
      });

      it('should refuse an updateUser call to an email of another account in another case', async () => {
         const admin = await createTestUser();
         await createTestUser({ email: 'taken@test.com', role: 'editor' });
         const other = await createTestUser({ email: 'other@test.com', role: 'editor' });
         const tool = getApp().get(UpdateUserTool);

         await expect(
            tool.execute(adminContext(admin.id), { id: other.id, email: 'Taken@Test.com' }),
         ).rejects.toThrow('User with this email already exists');
         await expect(
            tool.execute(adminContext(admin.id), { id: other.id, email: 'Renamed@Test.com' }),
         ).resolves.toMatchObject({ email: 'renamed@test.com' });
      });
   });

   it('should refuse an email that is not trimmed and in lower case in the database', async () => {
      await expect(createTestUser({ email: 'Mixed@Test.com' })).rejects.toThrow(
         /users_email_normalized_check/,
      );
      await expect(createTestUser({ email: ' spaced@test.com' })).rejects.toThrow(
         /users_email_normalized_check/,
      );
   });
});
