import { z } from 'zod';

import { PROVIDER_IDS, type ProviderId } from '@/ai/models';
import { DEFAULT_TRASH_RETENTION_DAYS } from '@/common/trash/trash';

import { DEFAULT_DATABASE_POOL_MAX, DEFAULT_REDIS_COMMAND_TIMEOUT_MS } from './connection-limits';

const PROVIDER_API_KEYS = {
   google: 'GOOGLE_GENERATIVE_AI_API_KEY',
   anthropic: 'ANTHROPIC_API_KEY',
} as const satisfies Record<ProviderId, string>;

const envSchema = z
   .object({
      JWT_SECRET: z.string().min(32, 'JWT_SECRET: at least 32 characters'),
      JWT_EXPIRATION: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().positive().default(3600),
      ),
      JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET: at least 32 characters'),
      JWT_REFRESH_EXPIRATION: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().positive().default(604800),
      ),
      ADMIN_URL: z.string().min(1, 'ADMIN_URL is required'),
      PREVIEW_URL_SIGNING_KEY: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.string().min(32, 'PREVIEW_URL_SIGNING_KEY: at least 32 characters').optional(),
      ),
      PREVIEW_API_TOKEN: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.string().min(32, 'PREVIEW_API_TOKEN: at least 32 characters').optional(),
      ),
      PREVIEW_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
      REVALIDATE_SECRET: z.string().min(32, 'REVALIDATE_SECRET: at least 32 characters'),
      AI_TOOL_APPROVAL_SECRET: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.string().min(32, 'AI_TOOL_APPROVAL_SECRET: at least 32 characters').optional(),
      ),
      LLM_PROVIDER: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(PROVIDER_IDS).default('google'),
      ),
      GOOGLE_GENERATIVE_AI_API_KEY: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.string().optional(),
      ),
      ANTHROPIC_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
      OPENAI_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
      AI_CHAT_MAX_OUTPUT_TOKENS: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().min(1024).max(65_536).optional(),
      ),
      AI_CHAT_TURN_TIMEOUT_MS: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().min(30_000).max(900_000).optional(),
      ),
      REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
      REDIS_KEY_PREFIX: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z
            .string()
            .regex(/^[A-Za-z0-9_-]{1,32}$/, 'REDIS_KEY_PREFIX: 1-32 letters, digits, _ or -')
            .optional(),
      ),
      REDIS_COMMAND_TIMEOUT_MS: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().min(100).max(10_000).default(DEFAULT_REDIS_COMMAND_TIMEOUT_MS),
      ),
      DATABASE_POOL_MAX: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().min(1).max(45).default(DEFAULT_DATABASE_POOL_MAX),
      ),
      R2_BUCKET: z.string().min(1, 'R2_BUCKET is required'),
      R2_PUBLIC_URL: z.string().min(1, 'R2_PUBLIC_URL is required'),
      R2_ENDPOINT: z.string().min(1, 'R2_ENDPOINT is required'),
      R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
      R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
      R2_FORCE_PATH_STYLE: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(['true', 'false']).optional(),
      ),
      RUNNER_SCORE_CLEANUP_ENABLED: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(['true', 'false']).optional(),
      ),
      TRASH_PURGE_ENABLED: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(['true', 'false']).optional(),
      ),
      TRASH_RETENTION_DAYS: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.coerce.number().int().min(1).max(365).default(DEFAULT_TRASH_RETENTION_DAYS),
      ),
      SWAGGER_ENABLED: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(['true', 'false']).optional(),
      ),
      SWAGGER_USERNAME: z.preprocess(
         (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
         z
            .string()
            .refine((v) => !v.includes(':'), 'SWAGGER_USERNAME: must not contain a colon')
            .optional(),
      ),
      SWAGGER_PASSWORD: z.preprocess(
         (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
         z.string().optional(),
      ),
      RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
      EMAIL_FROM: z.string().min(1, 'EMAIL_FROM is required'),
      DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
      WEB_URL: z.string().min(1, 'WEB_URL is required'),
      PORT: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().default(3000)),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      APP_ENV: z.preprocess(
         (v) => (v === '' ? undefined : v),
         z.enum(['development', 'staging', 'production', 'test'], {
            error: 'APP_ENV is required: development, staging, production or test',
         }),
      ),
      CORS_ORIGINS: z
         .string()
         .optional()
         .transform((v) =>
            v
               ? v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
               : [],
         ),
   })
   .catchall(z.unknown())
   .superRefine((env, ctx) => {
      const {
         PREVIEW_URL_SIGNING_KEY: key,
         PREVIEW_API_TOKEN: token,
         PREVIEW_SECRET: legacy,
      } = env;
      const issue = (path: string, message: string) =>
         ctx.addIssue({ code: 'custom', path: [path], message });

      if (Boolean(env.SWAGGER_USERNAME) !== Boolean(env.SWAGGER_PASSWORD)) {
         issue(
            env.SWAGGER_USERNAME ? 'SWAGGER_PASSWORD' : 'SWAGGER_USERNAME',
            'SWAGGER_USERNAME and SWAGGER_PASSWORD must be set together (or both left unset)',
         );
      }
      if (env.SWAGGER_PASSWORD && env.SWAGGER_PASSWORD.length < 16) {
         issue('SWAGGER_PASSWORD', 'SWAGGER_PASSWORD: at least 16 characters');
      }

      if (
         (env.APP_ENV === 'staging' || env.APP_ENV === 'production') &&
         env.NODE_ENV !== 'production'
      ) {
         issue(
            'APP_ENV',
            `APP_ENV=${env.APP_ENV} requires NODE_ENV=production (NODE_ENV is ${env.NODE_ENV} or unset)`,
         );
      }

      if (env.JWT_EXPIRATION >= env.JWT_REFRESH_EXPIRATION) {
         issue('JWT_EXPIRATION', 'JWT_EXPIRATION must be shorter than JWT_REFRESH_EXPIRATION');
      }

      if (env.NODE_ENV === 'production' && !env.AI_TOOL_APPROVAL_SECRET) {
         issue('AI_TOOL_APPROVAL_SECRET', 'AI_TOOL_APPROVAL_SECRET is required in production');
      }

      const providerKey = PROVIDER_API_KEYS[env.LLM_PROVIDER];
      if (env.NODE_ENV === 'production' && !env[providerKey]) {
         issue(
            providerKey,
            `${providerKey} is required in production with LLM_PROVIDER=${env.LLM_PROVIDER}`,
         );
      }

      if (!key && !legacy) {
         issue(
            'PREVIEW_URL_SIGNING_KEY',
            'PREVIEW_URL_SIGNING_KEY is required (or the legacy PREVIEW_SECRET)',
         );
      }
      if (!token && !legacy) {
         issue('PREVIEW_API_TOKEN', 'PREVIEW_API_TOKEN is required (or the legacy PREVIEW_SECRET)');
      }
      if (key && key === token) {
         issue('PREVIEW_API_TOKEN', 'PREVIEW_API_TOKEN must differ from PREVIEW_URL_SIGNING_KEY');
      }
      if (legacy && (key === legacy || token === legacy)) {
         issue(
            'PREVIEW_SECRET',
            'PREVIEW_URL_SIGNING_KEY and PREVIEW_API_TOKEN must not reuse PREVIEW_SECRET',
         );
      }
   });

export function validateEnv(config: Record<string, unknown>) {
   const result = envSchema.safeParse(config);
   if (!result.success) {
      const missing = result.error.issues
         .map((i) => `  ${i.path.join('.')}: ${i.message}`)
         .join('\n');
      throw new Error(`\nConfig validation failed:\n${missing}\n`);
   }
   return result.data;
}
