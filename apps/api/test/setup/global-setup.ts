import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import { GenericContainer } from 'testcontainers';

export default async (): Promise<void> => {
   if (!process.env.NODE_OPTIONS?.includes('--experimental-vm-modules')) {
      throw new Error(
         'Run the e2e suite with NODE_OPTIONS=--experimental-vm-modules (`pnpm test` sets it).',
      );
   }
   if (!process.execArgv.includes('--no-compilation-cache')) {
      throw new Error(
         'Run the e2e suite with `node --no-compilation-cache node_modules/jest/bin/jest.js` ' +
            '(`pnpm test` and CI do; add a test path to run one suite).',
      );
   }

   const [container, redis] = await Promise.all([
      new PostgreSqlContainer('postgres:16').start(),
      new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(),
   ]);

   const connectionString = container.getConnectionUri();

   process.env.DATABASE_URL = connectionString;
   process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
   process.env.WEB_URL = 'http://localhost:3000';
   process.env.PREVIEW_URL_SIGNING_KEY = 'test-preview-url-signing-key-0123456789';
   process.env.PREVIEW_API_TOKEN = 'test-preview-api-token-0123456789abcdef';
   process.env.REVALIDATE_SECRET = 'test-revalidate-secret-0123456789abcdef';
   process.env.APP_ENV = 'test';
   process.env.AI_TOOL_APPROVAL_SECRET = 'test-ai-tool-approval-secret-0123456789';
   process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef0123456789';
   process.env.JWT_EXPIRATION = '900';
   process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-0123456789abcdef01';
   process.env.JWT_REFRESH_EXPIRATION = '604800';
   process.env.RESEND_API_KEY = 'test-resend-key';
   process.env.EMAIL_FROM = 'test@test.com';
   process.env.ADMIN_URL = 'http://localhost:5173';
   process.env.R2_ACCESS_KEY_ID = 'test-key';
   process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
   process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
   process.env.R2_BUCKET = 'test-bucket';
   process.env.R2_PUBLIC_URL = 'https://test-storage.local';

   const migrationsDir = join(__dirname, '../../prisma/migrations');
   const migrationFolders = readdirSync(migrationsDir)
      .filter((dir) => !dir.endsWith('.toml'))
      .sort();

   const client = new pg.Client({ connectionString });
   await client.connect();

   try {
      for (const folder of migrationFolders) {
         const sqlPath = join(migrationsDir, folder, 'migration.sql');
         const sql = readFileSync(sqlPath, 'utf8');
         await client.query(sql);
      }
      await client.query(
         `ALTER DATABASE ${client.escapeIdentifier(container.getDatabase())} SET timezone TO 'Europe/Prague'`,
      );
   } finally {
      await client.end();
   }

   (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ = container;
   (globalThis as Record<string, unknown>).__REDIS_CONTAINER__ = redis;
};
