BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "ai_interactions" ADD COLUMN IF NOT EXISTS "cache_read_tokens" INTEGER;
ALTER TABLE "ai_interactions" ADD COLUMN IF NOT EXISTS "cache_write_tokens" INTEGER;

COMMIT;
