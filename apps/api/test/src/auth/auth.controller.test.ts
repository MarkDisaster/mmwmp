import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import type IORedis from 'ioredis';

import { TokenType } from '../../../src/auth/enum/token-type.enum';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../src/redis/redis.module';
import { captureEmails, emailsSent } from '../../setup/emails';
import { getApp, getHttpServer } from '../../setup/init';
import { createTestUser } from '../../setup/users';

describe('AuthController (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   describe('POST /auth/login', () => {
      it('should return access and refresh tokens with valid credentials', async () => {
         await createTestUser({ email: 'test@test.com' });

         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });

         expect(response.status).toBe(201);
         expect(response.body.accessToken).toBeDefined();
         expect(response.body.refreshToken).toBeDefined();
      });

      it('should return 401 with wrong password', async () => {
         await createTestUser({ email: 'test@test.com' });

         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'wrongpassword' });

         expect(response.status).toBe(401);
      });

      it('should return 401 with non-existent email', async () => {
         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'nobody@test.com', password: 'password123' });

         expect(response.status).toBe(401);
      });

      it('should return 400 with invalid email format', async () => {
         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'not-an-email', password: 'password123' });

         expect(response.status).toBe(400);
      });

      it('should return 400 with short password', async () => {
         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'short' });

         expect(response.status).toBe(400);
      });

      const failLogin = (realIp: string, forwardedFor?: string) => {
         const req = getHttpServer().post('/auth/login').set('X-Real-IP', realIp);
         if (forwardedFor) req.set('X-Forwarded-For', forwardedFor);
         return req.send({ email: 'test@test.com', password: 'wrongpassword' });
      };

      it('should count attempts per X-Real-IP whatever X-Forwarded-For the caller sends', async () => {
         await createTestUser({ email: 'test@test.com' });

         for (let i = 1; i <= 5; i++) {
            expect((await failLogin('198.51.100.1', `203.0.113.${i}`)).status).toBe(401);
         }

         expect((await failLogin('198.51.100.1', '203.0.113.99')).status).toBe(429);
      });

      it('should keep separate limits for two X-Real-IP addresses', async () => {
         await createTestUser({ email: 'test@test.com' });

         for (let i = 0; i < 5; i++) await failLogin('198.51.100.1');

         expect((await failLogin('198.51.100.1')).status).toBe(429);
         expect((await failLogin('198.51.100.2')).status).toBe(401);
      });

      it('should limit the wrong passwords on one account from many addresses', async () => {
         await createTestUser({ email: 'test@test.com' });

         for (let i = 1; i <= 30; i++) {
            expect((await failLogin(`198.51.100.${i}`)).status).toBe(401);
         }

         const response = await getHttpServer()
            .post('/auth/login')
            .set('X-Real-IP', '198.51.100.31')
            .send({ email: 'test@test.com', password: 'password123' });
         expect(response.status).toBe(429);
         expect(response.body.retryAfterSeconds).toBeGreaterThan(0);
      });

      it('should not lock the account for other addresses from one address', async () => {
         await createTestUser({ email: 'test@test.com' });

         for (let i = 0; i < 31; i++) await failLogin('198.51.100.1');

         const response = await getHttpServer()
            .post('/auth/login')
            .set('X-Real-IP', '198.51.100.2')
            .send({ email: 'test@test.com', password: 'password123' });
         expect(response.status).toBe(201);
      });

      it('should clear both counters after a successful login', async () => {
         await createTestUser({ email: 'test@test.com' });
         for (let i = 0; i < 4; i++) await failLogin('198.51.100.1');

         const ok = await getHttpServer()
            .post('/auth/login')
            .set('X-Real-IP', '198.51.100.1')
            .send({ email: 'test@test.com', password: 'password123' });
         expect(ok.status).toBe(201);

         for (let i = 0; i < 5; i++) {
            expect((await failLogin('198.51.100.1')).status).toBe(401);
         }
      });

      it('should answer 503 and not check the password while Redis does not count', async () => {
         await createTestUser({ email: 'test@test.com' });
         const multi = jest.spyOn(getApp().get<IORedis>(REDIS_CLIENT), 'multi');
         multi.mockImplementation(() => {
            throw new Error('Connection is closed.');
         });

         const response = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });
         multi.mockRestore();

         expect(response.status).toBe(503);
         expect(response.body.accessToken).toBeUndefined();
      });

      it('should count the global throttler per X-Real-IP in Redis', async () => {
         const remaining = async (realIp: string, forwardedFor: string) => {
            const response = await getHttpServer()
               .post('/auth/refresh')
               .set('X-Real-IP', realIp)
               .set('X-Forwarded-For', forwardedFor)
               .send({ refreshToken: 'unknown' });
            return Number(response.headers['x-ratelimit-remaining']);
         };

         const first = await remaining('198.51.100.1', '203.0.113.1');
         expect(await remaining('198.51.100.1', '203.0.113.2')).toBe(first - 1);
         expect(await remaining('198.51.100.2', '203.0.113.2')).toBe(first);
         expect(await getApp().get<IORedis>(REDIS_CLIENT).keys('throttler:*')).not.toHaveLength(0);
      });
   });

   describe('POST /auth/refresh', () => {
      it('should return new tokens with valid refresh token', async () => {
         await createTestUser({ email: 'test@test.com' });

         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });

         const response = await getHttpServer()
            .post('/auth/refresh')
            .send({ refreshToken: loginResponse.body.refreshToken });

         expect(response.status).toBe(201);
         expect(response.body.accessToken).toBeDefined();
         expect(response.body.refreshToken).toBeDefined();
      });

      it('should return 401 with invalid refresh token', async () => {
         const response = await getHttpServer()
            .post('/auth/refresh')
            .send({ refreshToken: 'invalid-token' });

         expect(response.status).toBe(401);
      });

      it('should revoke old refresh token after use', async () => {
         await createTestUser({ email: 'test@test.com' });

         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });

         const oldToken = loginResponse.body.refreshToken;

         await getHttpServer().post('/auth/refresh').send({ refreshToken: oldToken }).expect(201);

         const response = await getHttpServer()
            .post('/auth/refresh')
            .send({ refreshToken: oldToken });

         expect(response.status).toBe(401);
      });

      it('should refuse a refresh token that a concurrent request revoked after it was read', async () => {
         await createTestUser({ email: 'test@test.com' });
         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });
         const refreshToken = loginResponse.body.refreshToken;
         const delegate = prisma.refreshToken;
         const findUnique = delegate.findUnique.bind(delegate);
         jest.spyOn(delegate, 'findUnique').mockImplementationOnce(((args: never) =>
            findUnique(args).then(async (stored) => {
               await delegate.updateMany({
                  where: { tokenHash: createHash('sha256').update(refreshToken).digest('hex') },
                  data: { isRevoked: true },
               });
               return stored;
            })) as never);

         const response = await getHttpServer().post('/auth/refresh').send({ refreshToken });

         expect(response.status).toBe(401);
         expect(await prisma.refreshToken.count()).toBe(1);
         jest.restoreAllMocks();
      });
   });

   describe('POST /auth/logout', () => {
      it('should revoke refresh token', async () => {
         await createTestUser({ email: 'test@test.com' });

         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });

         const { accessToken, refreshToken } = loginResponse.body;

         const logoutResponse = await getHttpServer()
            .post('/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken });

         expect(logoutResponse.status).toBe(201);

         const refreshResponse = await getHttpServer().post('/auth/refresh').send({ refreshToken });

         expect(refreshResponse.status).toBe(401);
      });

      it('should revoke the refresh token without an access token', async () => {
         await createTestUser({ email: 'test@test.com' });
         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password123' });
         const { refreshToken } = loginResponse.body;

         const logoutResponse = await getHttpServer().post('/auth/logout').send({ refreshToken });

         expect(logoutResponse.status).toBe(201);
         expect((await getHttpServer().post('/auth/refresh').send({ refreshToken })).status).toBe(
            401,
         );
      });

      it('should answer an unknown refresh token like a known one', async () => {
         const response = await getHttpServer()
            .post('/auth/logout')
            .send({ refreshToken: 'some-token' });

         expect(response.status).toBe(201);
      });
   });

   describe('POST /auth/forgot-password', () => {
      it('should return 200 with existing email', async () => {
         await createTestUser({ email: 'test@test.com' });

         const response = await getHttpServer()
            .post('/auth/forgot-password')
            .send({ email: 'test@test.com' });

         expect(response.status).toBe(200);
      });

      it('should return 200 with non-existent email (no leak)', async () => {
         const response = await getHttpServer()
            .post('/auth/forgot-password')
            .send({ email: 'nobody@test.com' });

         expect(response.status).toBe(200);
      });

      it('should return 400 with invalid email format', async () => {
         const response = await getHttpServer()
            .post('/auth/forgot-password')
            .send({ email: 'not-an-email' });

         expect(response.status).toBe(400);
      });

      const forgot = (email: string, realIp: string) =>
         getHttpServer().post('/auth/forgot-password').set('X-Real-IP', realIp).send({ email });

      it('should send at most 3 links to one email in the window, with the same answer', async () => {
         await createTestUser({ email: 'test@test.com' });
         const queued = captureEmails();

         for (let i = 1; i <= 4; i++) {
            expect((await forgot('test@test.com', `198.51.100.${i}`)).status).toBe(200);
         }
         await emailsSent(3);
         const sent = queued.mock.calls.length;
         jest.restoreAllMocks();

         expect(sent).toBe(3);
      });

      it('should answer 429 after 10 requests from one address', async () => {
         for (let i = 1; i <= 10; i++) {
            expect((await forgot(`user${i}@test.com`, '198.51.100.1')).status).toBe(200);
         }

         expect((await forgot('user11@test.com', '198.51.100.1')).status).toBe(429);
         expect((await forgot('user11@test.com', '198.51.100.2')).status).toBe(200);
      });

      it('should not use up the links of an email with requests refused by the address limit', async () => {
         await createTestUser({ email: 'test@test.com' });
         for (let i = 1; i <= 10; i++) await forgot(`user${i}@test.com`, '198.51.100.1');
         for (let i = 0; i < 5; i++) await forgot('test@test.com', '198.51.100.1');
         const queued = captureEmails();

         expect((await forgot('test@test.com', '198.51.100.2')).status).toBe(200);
         await emailsSent(1);
         const sent = queued.mock.calls.length;
         jest.restoreAllMocks();

         expect(sent).toBe(1);
      });

      it('should answer 503 and send nothing while Redis does not count the email', async () => {
         await createTestUser({ email: 'test@test.com' });
         const queued = captureEmails();
         const redis = getApp().get<IORedis>(REDIS_CLIENT);
         const original = redis.multi.bind(redis);
         const multi = jest.spyOn(redis, 'multi');
         multi
            .mockImplementationOnce(() => original())
            .mockImplementation(() => {
               throw new Error('Connection is closed.');
            });

         const response = await forgot('test@test.com', '198.51.100.1');
         multi.mockRestore();
         const sent = queued.mock.calls.length;
         jest.restoreAllMocks();

         expect(response.status).toBe(503);
         expect(sent).toBe(0);
      });
   });

   describe('POST /auth/reset-password', () => {
      it('should reset password with valid token', async () => {
         await createTestUser({ email: 'test@test.com' });
         const queued = captureEmails();
         await getHttpServer().post('/auth/forgot-password').send({ email: 'test@test.com' });
         await emailsSent();
         const [{ body }] = queued.mock.calls[0] as [{ body: string }];
         jest.restoreAllMocks();
         const token = /reset-password\/([^\s]+)/.exec(body)?.[1];

         const response = await getHttpServer()
            .post('/auth/reset-password')
            .send({ token, newPassword: 'newpassword123' });

         expect(response.status).toBe(200);

         const loginResponse = await getHttpServer()
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'newpassword123' });

         expect(loginResponse.status).toBe(201);
         expect(loginResponse.body.accessToken).toBeDefined();
      });

      it('should return 400 for a reset token without the password fingerprint', async () => {
         const user = await createTestUser({ email: 'test@test.com' });
         const token = await getApp()
            .get(JwtService)
            .signAsync({ sub: user.id, type: TokenType.PASSWORD_RESET }, { expiresIn: 900 });

         const response = await getHttpServer()
            .post('/auth/reset-password')
            .send({ token, newPassword: 'newpassword123' });

         expect(response.status).toBe(400);
      });

      it('should return 400 with invalid token', async () => {
         const response = await getHttpServer()
            .post('/auth/reset-password')
            .send({ token: 'invalid-token', newPassword: 'newpassword123' });

         expect(response.status).toBe(400);
      });

      it('should return 400 with short password', async () => {
         const response = await getHttpServer()
            .post('/auth/reset-password')
            .send({ token: 'some-token', newPassword: 'short' });

         expect(response.status).toBe(400);
      });
   });
});
