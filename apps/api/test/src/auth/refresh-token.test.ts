import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Job } from 'bullmq';
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

import { TokenType } from '../../../src/auth/enum/token-type.enum';
import { RefreshTokenCleanupProcessor } from '../../../src/auth/refresh-token-cleanup.processor';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { getApp, getHttpServer } from '../../setup/init';
import { holdLock, startRequest, waitForLockWait } from '../../setup/locks';
import { createTestUser, TEST_PASSWORD } from '../../setup/users';

type Tokens = { accessToken: string; refreshToken: string; expiresAt: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 30 * DAY_MS;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('Refresh tokens (e2e)', () => {
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

   const login = async (email: string): Promise<Tokens> => {
      const response = await getHttpServer()
         .post('/auth/login')
         .send({ email, password: TEST_PASSWORD });
      expect(response.status).toBe(201);
      return response.body;
   };

   const refresh = (refreshToken: string) =>
      getHttpServer().post('/auth/refresh').send({ refreshToken });

   const rowOf = (refreshToken: string) =>
      prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: sha256(refreshToken) } });

   describe('storage', () => {
      it('stores the SHA-256 of the refresh token, never the token', async () => {
         const user = await createTestUser();

         const { refreshToken } = await login(user.email);

         const rows = await prisma.refreshToken.findMany();
         expect(rows).toHaveLength(1);
         expect(rows[0].token).toBeNull();
         expect(rows[0].tokenHash).toBe(sha256(refreshToken));
      });

      it('keeps the family and the session start through a rotation', async () => {
         const user = await createTestUser();
         const first = await login(user.email);

         const second = (await refresh(first.refreshToken)).body as Tokens;

         const [before, after] = await Promise.all([
            rowOf(first.refreshToken),
            rowOf(second.refreshToken),
         ]);
         expect(after.familyId).toBe(before.familyId);
         expect(after.sessionStartedAt).toEqual(before.sessionStartedAt);
      });
   });

   describe('reuse detection', () => {
      it('revokes the whole family when a rotated token is used again', async () => {
         const user = await createTestUser();
         const first = await login(user.email);
         const second = (await refresh(first.refreshToken)).body as Tokens;

         expect((await refresh(first.refreshToken)).status).toBe(401);

         expect((await refresh(second.refreshToken)).status).toBe(401);
         expect(await prisma.refreshToken.count({ where: { isRevoked: false } })).toBe(0);
      });

      it('leaves the other sessions of the user alone', async () => {
         const user = await createTestUser();
         const stolen = await login(user.email);
         const otherDevice = await login(user.email);
         await refresh(stolen.refreshToken).expect(201);

         await refresh(stolen.refreshToken).expect(401);

         expect((await refresh(otherDevice.refreshToken)).status).toBe(201);
      });

      it('gives one of two concurrent requests with the same token a new pair, then revokes it', async () => {
         const user = await createTestUser();
         const { refreshToken } = await login(user.email);
         const held = await holdLock('SELECT 1 FROM auth WHERE user_id = $1 FOR NO KEY UPDATE', [
            user.id,
         ]);
         const requests = [refresh(refreshToken), refresh(refreshToken)].map(startRequest);
         try {
            await waitForLockWait(prisma, 4_000, 2);
         } finally {
            await held.release();
         }

         const responses = await Promise.all(requests.map((request) => request.promise));

         expect(responses.map((response) => response.status).sort()).toEqual([201, 401]);
         expect(await prisma.refreshToken.count({ where: { isRevoked: false } })).toBe(0);
         const issued = responses.find((response) => response.status === 201)?.body as Tokens;
         expect((await refresh(issued.refreshToken)).status).toBe(401);
      });

      it('does not take a token revoked by a logout for a reuse', async () => {
         const user = await createTestUser();
         const { refreshToken } = await login(user.email);
         await getHttpServer().post('/auth/logout').send({ refreshToken }).expect(201);
         const warn = jest.spyOn(Logger.prototype, 'warn');

         const response = await refresh(refreshToken);

         expect(response.status).toBe(401);
         expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('reused'));
         warn.mockRestore();
      });

      it('reports a rotated token used again as a reuse', async () => {
         const user = await createTestUser();
         const { refreshToken } = await login(user.email);
         await refresh(refreshToken).expect(201);
         const warn = jest.spyOn(Logger.prototype, 'warn');

         await refresh(refreshToken).expect(401);

         expect(warn).toHaveBeenCalledWith(expect.stringContaining('reused'));
         warn.mockRestore();
      });

      it('revokes the token a rotation in progress issues', async () => {
         const user = await createTestUser();
         const first = await login(user.email);
         const second = (await refresh(first.refreshToken)).body as Tokens;
         const { familyId, sessionStartedAt } = await rowOf(second.refreshToken);
         const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
         await client.connect();
         await client.query('BEGIN');
         await client.query('SELECT password FROM auth WHERE user_id = $1 FOR SHARE', [user.id]);
         await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, family_id, session_started_at, expires_at)
             VALUES ($1, $2, $3, $4, now() + interval '7 days')`,
            [user.id, sha256('in-flight'), familyId, sessionStartedAt],
         );

         const reuse = startRequest(refresh(first.refreshToken));
         try {
            await waitForLockWait(prisma);
            expect(reuse.isSettled()).toBe(false);
         } finally {
            await client.query('COMMIT');
            await client.end();
         }

         expect((await reuse.promise).status).toBe(401);
         expect(await prisma.refreshToken.count({ where: { isRevoked: false } })).toBe(0);
      });
   });

   describe('absolute lifetime', () => {
      it('refuses a refresh once the session is older than its maximum age', async () => {
         const user = await createTestUser();
         const { refreshToken } = await login(user.email);
         await prisma.refreshToken.updateMany({
            data: { sessionStartedAt: new Date(Date.now() - SESSION_MAX_AGE_MS - 60_000) },
         });

         const response = await refresh(refreshToken);

         expect(response.status).toBe(401);
      });

      it('issues tokens that expire with the session, not later', async () => {
         const user = await createTestUser();
         const { refreshToken } = await login(user.email);
         const sessionEnd = Date.now() + 10 * 60_000;
         await prisma.refreshToken.updateMany({
            data: { sessionStartedAt: new Date(sessionEnd - SESSION_MAX_AGE_MS) },
         });

         const response = await refresh(refreshToken);

         expect(response.status).toBe(201);
         const body = response.body as Tokens;
         expect(Date.parse(body.expiresAt)).toBeLessThanOrEqual(sessionEnd);
         expect((await rowOf(body.refreshToken)).expiresAt.getTime()).toBeLessThanOrEqual(
            sessionEnd,
         );
      });
   });

   describe('POST /auth/logout', () => {
      it('ends the session of any token of the family without an access token', async () => {
         const user = await createTestUser();
         const first = await login(user.email);
         const second = (await refresh(first.refreshToken)).body as Tokens;

         const response = await getHttpServer()
            .post('/auth/logout')
            .send({ refreshToken: first.refreshToken });

         expect(response.status).toBe(201);
         expect((await refresh(second.refreshToken)).status).toBe(401);
      });
   });

   describe('tokens issued before hashing', () => {
      it('keep working after the migration hashes them', async () => {
         const user = await createTestUser();
         const legacyToken = await getApp()
            .get(JwtService)
            .signAsync(
               { sub: user.id, email: user.email, type: TokenType.REFRESH, jti: randomUUID() },
               { secret: process.env.JWT_REFRESH_SECRET, expiresIn: 3600 },
            );
         await prisma.refreshToken.create({
            data: { token: legacyToken, userId: user.id, expiresAt: new Date(Date.now() + DAY_MS) },
         });
         const migration = readFileSync(
            join(
               __dirname,
               '../../../prisma/migrations/20261112100000_refresh_token_hash_family/migration.sql',
            ),
            'utf8',
         );
         const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
         await client.connect();
         await client.query(migration);
         await client.end();

         const response = await refresh(legacyToken);

         expect(response.status).toBe(201);
      });
   });

   describe('cleanup', () => {
      it('deletes expired tokens and keeps revoked ones that have not expired', async () => {
         const user = await createTestUser();
         const base = { userId: user.id, familyId: randomUUID(), sessionStartedAt: new Date() };
         await prisma.refreshToken.createMany({
            data: [
               { ...base, tokenHash: sha256('expired'), expiresAt: new Date(Date.now() - 1000) },
               {
                  ...base,
                  tokenHash: sha256('revoked'),
                  isRevoked: true,
                  expiresAt: new Date(Date.now() + DAY_MS),
               },
               { ...base, tokenHash: sha256('live'), expiresAt: new Date(Date.now() + DAY_MS) },
            ],
         });

         const result = await getApp()
            .get(RefreshTokenCleanupProcessor)
            .process({ name: 'cleanup', id: '1' } as Job);

         expect(result).toEqual({ deleted: 1 });
         const left = await prisma.refreshToken.findMany({ select: { tokenHash: true } });
         expect(left.map((row) => row.tokenHash).sort()).toEqual(
            [sha256('live'), sha256('revoked')].sort(),
         );
      });
   });
});
