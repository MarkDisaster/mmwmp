import { JwtService } from '@nestjs/jwt';

import { TokenType } from '../../../src/auth/enum/token-type.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { captureEmails, emailsSent } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { createAdminAndLogin, createTestUser, getRoleId, loginAs } from '../../setup/users';

describe('UserInvitation (e2e)', () => {
   let prisma: PrismaService;
   let jwtService: JwtService;
   let editorRoleId: number;
   let sent: jest.SpyInstance;

   beforeAll(async () => {
      prisma = getApp().get(PrismaService);
      jwtService = getApp().get(JwtService);
      editorRoleId = await getRoleId('editor');
   });

   const cleanupDb = async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.auth.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(async () => {
      await cleanupDb();
      sent = captureEmails();
   });
   afterEach(() => jest.restoreAllMocks());
   afterAll(cleanupDb);

   describe('POST /users/invitations', () => {
      it('should invite a new user', async () => {
         const accessToken = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'newuser@test.com', roleId: editorRoleId });

         expect(response.status).toBe(201);
         expect(response.body.email).toBe('newuser@test.com');
         await emailsSent(1);
         expect(sent).toHaveBeenCalledTimes(1);
         expect(sent.mock.calls[0][0]).toMatchObject({ to: 'newuser@test.com' });
      });

      it('should return 409 if user already exists', async () => {
         const accessToken = await createAdminAndLogin();

         await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'newuser@test.com', roleId: editorRoleId });

         const response = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'newuser@test.com', roleId: editorRoleId });

         expect(response.status).toBe(409);
      });

      it('should return 403 for non-admin user', async () => {
         await createTestUser({ email: 'chief@test.com', role: 'editor' });
         const editorToken = await loginAs('chief@test.com');

         const response = await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${editorToken}`)
            .send({ email: 'someone@test.com', roleId: editorRoleId });

         expect(response.status).toBe(403);
      });
   });

   describe('HEAD /users/invitations/:token', () => {
      it('should return 200 for valid invitation token', async () => {
         const accessToken = await createAdminAndLogin();

         await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'invited@test.com', roleId: editorRoleId });

         const invitedUser = await prisma.user.findUnique({
            where: { email: 'invited@test.com' },
         });

         const token = await jwtService.signAsync(
            { sub: invitedUser?.id, type: TokenType.INVITATION },
            { expiresIn: '7d' },
         );

         const response = await getHttpServer().head(`/users/invitations/${token}`);

         expect(response.status).toBe(200);
      });

      it('should return 400 for invalid token', async () => {
         const response = await getHttpServer().head('/users/invitations/invalid-token');

         expect(response.status).toBe(400);
      });
   });

   describe('POST /users/invitations/:token/accept', () => {
      it('should accept invitation and set password', async () => {
         const accessToken = await createAdminAndLogin();

         await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'invited@test.com', roleId: editorRoleId });

         const invitedUser = await prisma.user.findUnique({
            where: { email: 'invited@test.com' },
         });

         const token = await jwtService.signAsync(
            { sub: invitedUser?.id, type: TokenType.INVITATION },
            { expiresIn: '7d' },
         );

         const response = await getHttpServer()
            .post(`/users/invitations/${token}/accept`)
            .send({ firstName: 'John', lastName: 'Doe', password: 'newpassword123' });

         expect(response.status).toBe(201);

         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'invited@test.com', password: 'newpassword123' });

         expect(loginResponse.status).toBe(201);
         expect(loginResponse.body.accessToken).toBeDefined();
      });

      it('should return 400 for already accepted invitation', async () => {
         const accessToken = await createAdminAndLogin();

         await getHttpServer()
            .post('/users/invitations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ email: 'invited@test.com', roleId: editorRoleId });

         const invitedUser = await prisma.user.findUnique({
            where: { email: 'invited@test.com' },
         });

         const token = await jwtService.signAsync(
            { sub: invitedUser?.id, type: TokenType.INVITATION },
            { expiresIn: '7d' },
         );

         await getHttpServer()
            .post(`/users/invitations/${token}/accept`)
            .send({ firstName: 'John', lastName: 'Doe', password: 'newpassword123' });

         const response = await getHttpServer()
            .post(`/users/invitations/${token}/accept`)
            .send({ firstName: 'John', lastName: 'Doe', password: 'newpassword123' });

         expect(response.status).toBe(400);
      });
   });
});
