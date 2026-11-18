import appConfig from '../app.config';
import { validateEnv } from '../validate';

describe('app config — TRASH_RETENTION_DAYS', () => {
   const original = process.env.TRASH_RETENTION_DAYS;
   afterEach(() => {
      if (original === undefined) delete process.env.TRASH_RETENTION_DAYS;
      else process.env.TRASH_RETENTION_DAYS = original;
   });

   it.each([undefined, ''])('has the default of the validation when it is %p', (value) => {
      if (value === undefined) delete process.env.TRASH_RETENTION_DAYS;
      else process.env.TRASH_RETENTION_DAYS = value;
      const validated = validateEnv({
         APP_ENV: 'test',
         JWT_SECRET: 'jwt-secret-0123456789abcdef0123456789',
         JWT_REFRESH_SECRET: 'jwt-refresh-secret-0123456789abcdef01',
         ADMIN_URL: 'http://localhost:5173',
         PREVIEW_URL_SIGNING_KEY: 'url-signing-key-of-at-least-32-characters',
         PREVIEW_API_TOKEN: 'api-token-of-at-least-32-characters-long',
         REVALIDATE_SECRET: 'revalidate-secret-0123456789abcdef01',
         REDIS_URL: 'redis://localhost:6379',
         R2_BUCKET: 'bucket',
         R2_PUBLIC_URL: 'http://localhost:9090/bucket',
         R2_ENDPOINT: 'http://localhost:9090',
         R2_ACCESS_KEY_ID: 'key',
         R2_SECRET_ACCESS_KEY: 'secret',
         RESEND_API_KEY: 're_test',
         EMAIL_FROM: 'noreply@example.com',
         DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
         WEB_URL: 'http://localhost:3047',
         TRASH_RETENTION_DAYS: value,
      });

      expect(appConfig().trashRetentionDays).toBe(validated.TRASH_RETENTION_DAYS);
   });

   it('reads a configured value', () => {
      process.env.TRASH_RETENTION_DAYS = '7';
      expect(appConfig().trashRetentionDays).toBe(7);
   });
});
