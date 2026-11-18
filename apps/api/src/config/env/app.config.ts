import { registerAs } from '@nestjs/config';

import { DEFAULT_TRASH_RETENTION_DAYS } from '@/common/trash/trash';

export default registerAs('app', () => ({
   port: parseInt(process.env.PORT || '3000', 10),
   nodeEnv: process.env.NODE_ENV ?? 'development',
   corsOrigins:
      process.env.CORS_ORIGINS?.split(',')
         .map((s) => s.trim())
         .filter(Boolean) ?? [],
   webUrl: process.env.WEB_URL,
   revalidateSecret: process.env.REVALIDATE_SECRET,
   swaggerEnabled:
      process.env.SWAGGER_ENABLED !== undefined && process.env.SWAGGER_ENABLED !== ''
         ? process.env.SWAGGER_ENABLED === 'true'
         : (process.env.NODE_ENV ?? 'development') !== 'production',
   swaggerUsername: process.env.SWAGGER_USERNAME || undefined,
   swaggerPassword: process.env.SWAGGER_PASSWORD || undefined,
   runnerScoreCleanupEnabled: process.env.RUNNER_SCORE_CLEANUP_ENABLED !== 'false',
   trashPurgeEnabled: process.env.TRASH_PURGE_ENABLED !== 'false',
   trashRetentionDays: parseInt(
      process.env.TRASH_RETENTION_DAYS || String(DEFAULT_TRASH_RETENTION_DAYS),
      10,
   ),
}));
