import { validateEnv } from '../validate';

const baseEnv = {
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
   GOOGLE_GENERATIVE_AI_API_KEY: 'google-api-key',
};

describe('validateEnv — R2_FORCE_PATH_STYLE', () => {
   it('is optional', () => {
      expect(() => validateEnv(baseEnv)).not.toThrow();
   });

   it.each(['true', 'false'])('accepts "%s"', (value) => {
      expect(validateEnv({ ...baseEnv, R2_FORCE_PATH_STYLE: value }).R2_FORCE_PATH_STYLE).toBe(
         value,
      );
   });

   it('treats an empty string as unset instead of failing the start-up', () => {
      expect(validateEnv({ ...baseEnv, R2_FORCE_PATH_STYLE: '' }).R2_FORCE_PATH_STYLE).toBe(
         undefined,
      );
   });

   it('rejects anything else', () => {
      expect(() => validateEnv({ ...baseEnv, R2_FORCE_PATH_STYLE: 'yes' })).toThrow(
         /R2_FORCE_PATH_STYLE/,
      );
   });
});

describe('validateEnv — REDIS_KEY_PREFIX', () => {
   it('is optional and treats an empty string as unset', () => {
      expect(validateEnv(baseEnv).REDIS_KEY_PREFIX).toBeUndefined();
      expect(validateEnv({ ...baseEnv, REDIS_KEY_PREFIX: '' }).REDIS_KEY_PREFIX).toBeUndefined();
   });

   it.each(['staging', 'prod_2', 'mm-production'])('accepts "%s"', (value) => {
      expect(validateEnv({ ...baseEnv, REDIS_KEY_PREFIX: value }).REDIS_KEY_PREFIX).toBe(value);
   });

   it.each(['staging:', 'a*', 'with space', 'x'.repeat(33)])('rejects %p', (value) => {
      expect(() => validateEnv({ ...baseEnv, REDIS_KEY_PREFIX: value })).toThrow(
         /REDIS_KEY_PREFIX/,
      );
   });
});

describe('validateEnv — connection limits', () => {
   it('defaults to 1000 ms per Redis command and 10 database connections', () => {
      const env = validateEnv({ ...baseEnv, REDIS_COMMAND_TIMEOUT_MS: '', DATABASE_POOL_MAX: '' });
      expect(env.REDIS_COMMAND_TIMEOUT_MS).toBe(1000);
      expect(env.DATABASE_POOL_MAX).toBe(10);
   });

   it('accepts values within the bounds', () => {
      const env = validateEnv({
         ...baseEnv,
         REDIS_COMMAND_TIMEOUT_MS: '250',
         DATABASE_POOL_MAX: '4',
      });
      expect(env.REDIS_COMMAND_TIMEOUT_MS).toBe(250);
      expect(env.DATABASE_POOL_MAX).toBe(4);
   });

   it.each([
      ['REDIS_COMMAND_TIMEOUT_MS', '0'],
      ['REDIS_COMMAND_TIMEOUT_MS', '60000'],
      ['REDIS_COMMAND_TIMEOUT_MS', 'soon'],
      ['DATABASE_POOL_MAX', '0'],
      ['DATABASE_POOL_MAX', '46'],
      ['DATABASE_POOL_MAX', '2.5'],
   ])('rejects %s=%p', (name, value) => {
      expect(() => validateEnv({ ...baseEnv, [name]: value })).toThrow(new RegExp(name));
   });
});

describe('validateEnv — AI_TOOL_APPROVAL_SECRET', () => {
   it('is optional outside production and treats an empty string as unset', () => {
      expect(validateEnv(baseEnv).AI_TOOL_APPROVAL_SECRET).toBeUndefined();
      expect(
         validateEnv({ ...baseEnv, AI_TOOL_APPROVAL_SECRET: '' }).AI_TOOL_APPROVAL_SECRET,
      ).toBeUndefined();
   });

   it.each([undefined, ''])('is required in production (%p)', (value) => {
      expect(() =>
         validateEnv({ ...baseEnv, NODE_ENV: 'production', AI_TOOL_APPROVAL_SECRET: value }),
      ).toThrow(/AI_TOOL_APPROVAL_SECRET is required in production/);
   });

   it('accepts a value of 32 characters or more', () => {
      const value = 'a'.repeat(32);
      expect(
         validateEnv({ ...baseEnv, AI_TOOL_APPROVAL_SECRET: value }).AI_TOOL_APPROVAL_SECRET,
      ).toBe(value);
      expect(() =>
         validateEnv({ ...baseEnv, NODE_ENV: 'production', AI_TOOL_APPROVAL_SECRET: value }),
      ).not.toThrow();
   });

   it('rejects a shorter value without printing it', () => {
      const value = 'short-approval-secret';
      expect(() => validateEnv({ ...baseEnv, AI_TOOL_APPROVAL_SECRET: value })).toThrow(
         /AI_TOOL_APPROVAL_SECRET: at least 32 characters/,
      );
      expect(() => validateEnv({ ...baseEnv, AI_TOOL_APPROVAL_SECRET: value })).not.toThrow(value);
   });
});

describe('validateEnv — LLM_PROVIDER and provider keys', () => {
   const { GOOGLE_GENERATIVE_AI_API_KEY: _googleKey, ...withoutKeys } = baseEnv;
   const production = {
      ...withoutKeys,
      NODE_ENV: 'production',
      AI_TOOL_APPROVAL_SECRET: 'a'.repeat(32),
   };

   it.each([undefined, ''])('defaults to google (%p)', (value) => {
      expect(validateEnv({ ...baseEnv, LLM_PROVIDER: value }).LLM_PROVIDER).toBe('google');
   });

   it.each(['google', 'anthropic'])('accepts %p', (value) => {
      expect(validateEnv({ ...baseEnv, LLM_PROVIDER: value }).LLM_PROVIDER).toBe(value);
   });

   it.each(['antropic', 'gemini', 'Google'])('refuses the unknown provider %p', (value) => {
      expect(() => validateEnv({ ...baseEnv, LLM_PROVIDER: value })).toThrow(/LLM_PROVIDER/);
   });

   it('runs without a provider key outside production', () => {
      expect(() => validateEnv(withoutKeys)).not.toThrow();
   });

   it.each([
      ['google', 'GOOGLE_GENERATIVE_AI_API_KEY', 'ANTHROPIC_API_KEY'],
      ['anthropic', 'ANTHROPIC_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
   ])('requires the key of %p in production, not the other one', (provider, required, other) => {
      const env = { ...production, LLM_PROVIDER: provider };

      expect(() => validateEnv({ ...env, [other]: 'key' })).toThrow(
         new RegExp(`${required} is required in production with LLM_PROVIDER=${provider}`),
      );
      expect(() => validateEnv({ ...env, [required]: '' })).toThrow(new RegExp(required));
      expect(() => validateEnv({ ...env, [required]: 'key' })).not.toThrow();
   });

   it('treats an empty OPENAI_API_KEY as unset', () => {
      expect(validateEnv({ ...baseEnv, OPENAI_API_KEY: '' }).OPENAI_API_KEY).toBeUndefined();
   });
});

describe('validateEnv — draft preview secrets', () => {
   const { PREVIEW_URL_SIGNING_KEY: key, PREVIEW_API_TOKEN: token, ...withoutPreview } = baseEnv;

   it('accepts the two new values without the legacy secret', () => {
      const env = validateEnv(baseEnv);

      expect(env.PREVIEW_URL_SIGNING_KEY).toBe(key);
      expect(env.PREVIEW_API_TOKEN).toBe(token);
      expect(env.PREVIEW_SECRET).toBeUndefined();
   });

   it('falls back to the legacy PREVIEW_SECRET for whichever is unset', () => {
      expect(() => validateEnv({ ...withoutPreview, PREVIEW_SECRET: 'legacy' })).not.toThrow();
      expect(() =>
         validateEnv({ ...withoutPreview, PREVIEW_URL_SIGNING_KEY: key, PREVIEW_SECRET: 'legacy' }),
      ).not.toThrow();
      expect(() =>
         validateEnv({ ...withoutPreview, PREVIEW_API_TOKEN: token, PREVIEW_SECRET: 'legacy' }),
      ).not.toThrow();
   });

   it('requires each new value when the legacy secret is unset or empty', () => {
      expect(() => validateEnv({ ...withoutPreview, PREVIEW_API_TOKEN: token })).toThrow(
         /PREVIEW_URL_SIGNING_KEY is required/,
      );
      expect(() =>
         validateEnv({ ...withoutPreview, PREVIEW_URL_SIGNING_KEY: key, PREVIEW_SECRET: '' }),
      ).toThrow(/PREVIEW_API_TOKEN is required/);
   });

   it.each(['PREVIEW_URL_SIGNING_KEY', 'PREVIEW_API_TOKEN'])(
      'needs 32+ characters in %s',
      (name) => {
         expect(() => validateEnv({ ...baseEnv, [name]: 'x'.repeat(31) })).toThrow(
            new RegExp(`${name}: at least 32 characters`),
         );
      },
   );

   it('refuses one value in two roles', () => {
      expect(() => validateEnv({ ...baseEnv, PREVIEW_API_TOKEN: key })).toThrow(
         /PREVIEW_API_TOKEN must differ from PREVIEW_URL_SIGNING_KEY/,
      );
      expect(() => validateEnv({ ...baseEnv, PREVIEW_SECRET: token })).toThrow(
         /must not reuse PREVIEW_SECRET/,
      );
   });

   it('never prints a value in the error', () => {
      expect(() => validateEnv({ ...baseEnv, PREVIEW_API_TOKEN: key })).toThrow(
         expect.objectContaining({ message: expect.not.stringContaining(key) }),
      );
   });
});

describe('validateEnv — token lifetimes', () => {
   it('accepts an access token shorter than the refresh token', () => {
      expect(() =>
         validateEnv({ ...baseEnv, JWT_EXPIRATION: '900', JWT_REFRESH_EXPIRATION: '604800' }),
      ).not.toThrow();
   });

   it('refuses an access token that lives as long as the refresh token or longer', () => {
      expect(() =>
         validateEnv({ ...baseEnv, JWT_EXPIRATION: '604800', JWT_REFRESH_EXPIRATION: '3600' }),
      ).toThrow('JWT_EXPIRATION must be shorter than JWT_REFRESH_EXPIRATION');
   });

   it('refuses a lifetime that is not a positive whole number of seconds', () => {
      expect(() => validateEnv({ ...baseEnv, JWT_EXPIRATION: '0' })).toThrow('JWT_EXPIRATION');
      expect(() => validateEnv({ ...baseEnv, JWT_EXPIRATION: '1.5' })).toThrow('JWT_EXPIRATION');
   });
});

describe('validateEnv — SWAGGER_ENABLED', () => {
   it('is optional', () => {
      expect(validateEnv(baseEnv).SWAGGER_ENABLED).toBeUndefined();
   });

   it.each(['true', 'false'])('accepts "%s"', (value) => {
      expect(validateEnv({ ...baseEnv, SWAGGER_ENABLED: value }).SWAGGER_ENABLED).toBe(value);
   });

   it('rejects anything else', () => {
      expect(() => validateEnv({ ...baseEnv, SWAGGER_ENABLED: 'yes' })).toThrow('SWAGGER_ENABLED');
   });
});

describe('validateEnv — SWAGGER_USERNAME and SWAGGER_PASSWORD', () => {
   const password = 'a-password-of-16+chars';

   it('are optional, also with Swagger enabled (staging stays open as before)', () => {
      expect(() => validateEnv(baseEnv)).not.toThrow();
      expect(() => validateEnv({ ...baseEnv, SWAGGER_ENABLED: 'true' })).not.toThrow();
   });

   it('accept both together', () => {
      const env = validateEnv({
         ...baseEnv,
         SWAGGER_ENABLED: 'true',
         SWAGGER_USERNAME: 'docs',
         SWAGGER_PASSWORD: password,
      });
      expect(env.SWAGGER_USERNAME).toBe('docs');
   });

   it('treat empty strings as unset', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_USERNAME: '', SWAGGER_PASSWORD: '' }),
      ).not.toThrow();
   });

   it('refuse a user name without a password', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_ENABLED: 'true', SWAGGER_USERNAME: 'docs' }),
      ).toThrow(/SWAGGER_USERNAME and SWAGGER_PASSWORD must be set together/);
   });

   it('refuse a password without a user name', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_ENABLED: 'true', SWAGGER_PASSWORD: password }),
      ).toThrow(/must be set together/);
   });

   it('treat blank values as unset', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_USERNAME: ' ', SWAGGER_PASSWORD: ' '.repeat(16) }),
      ).not.toThrow();
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_USERNAME: 'docs', SWAGGER_PASSWORD: ' '.repeat(16) }),
      ).toThrow(/must be set together/);
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_USERNAME: '  ', SWAGGER_PASSWORD: password }),
      ).toThrow(/must be set together/);
   });

   it('refuse a user name with a colon', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_USERNAME: 'do:cs', SWAGGER_PASSWORD: password }),
      ).toThrow(/SWAGGER_USERNAME: must not contain a colon/);
   });

   it('fail closed on a half-set pair even with Swagger disabled', () => {
      expect(() =>
         validateEnv({ ...baseEnv, SWAGGER_ENABLED: 'false', SWAGGER_USERNAME: 'docs' }),
      ).toThrow(/must be set together/);
   });

   it('refuse a password shorter than 16 characters', () => {
      expect(() =>
         validateEnv({
            ...baseEnv,
            SWAGGER_ENABLED: 'true',
            SWAGGER_USERNAME: 'docs',
            SWAGGER_PASSWORD: 'short-15-chars!',
         }),
      ).toThrow(/SWAGGER_PASSWORD: at least 16 characters/);
   });
});

describe('validateEnv — APP_ENV', () => {
   it('is required', () => {
      const { APP_ENV: _omitted, ...withoutAppEnv } = baseEnv;
      expect(() => validateEnv(withoutAppEnv)).toThrow(/APP_ENV is required/);
      expect(() => validateEnv({ ...baseEnv, APP_ENV: '' })).toThrow(/APP_ENV is required/);
   });

   it('is required when NODE_ENV is missing too', () => {
      const { APP_ENV: _omitted, ...withoutAppEnv } = baseEnv;
      expect(() => validateEnv({ ...withoutAppEnv, NODE_ENV: undefined })).toThrow(
         /APP_ENV is required/,
      );
   });

   it.each(['development', 'test'])('accepts "%s" in any mode', (value) => {
      expect(validateEnv({ ...baseEnv, APP_ENV: value }).APP_ENV).toBe(value);
   });

   it.each(['staging', 'production'])('accepts "%s" with NODE_ENV=production', (value) => {
      const production = {
         ...baseEnv,
         NODE_ENV: 'production',
         AI_TOOL_APPROVAL_SECRET: 'a'.repeat(32),
      };
      expect(validateEnv({ ...production, APP_ENV: value }).APP_ENV).toBe(value);
   });

   it.each(['staging', 'production'])('refuses "%s" without NODE_ENV=production', (value) => {
      expect(() => validateEnv({ ...baseEnv, APP_ENV: value })).toThrow(
         new RegExp(
            `APP_ENV=${value} requires NODE_ENV=production \\(NODE_ENV is development or unset\\)`,
         ),
      );
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'development', APP_ENV: value })).toThrow(
         /requires NODE_ENV=production/,
      );
   });

   it('refuses a name that is not an environment', () => {
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'production', APP_ENV: 'prod' })).toThrow();
   });
});

describe('validateEnv — secrets of 32+ characters', () => {
   it.each(['JWT_SECRET', 'JWT_REFRESH_SECRET', 'REVALIDATE_SECRET'])(
      'rejects a short %s',
      (key) => {
         expect(() => validateEnv({ ...baseEnv, [key]: 'too-short' })).toThrow(
            new RegExp(`${key}: at least 32 characters`),
         );
      },
   );
});
