BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "refresh_tokens"
ADD COLUMN IF NOT EXISTS "token_hash" TEXT,
ADD COLUMN IF NOT EXISTS "family_id" UUID,
ADD COLUMN IF NOT EXISTS "session_started_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rotated_at" TIMESTAMP(3),
ALTER COLUMN "token" DROP NOT NULL;

COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';

UPDATE "refresh_tokens"
SET "token_hash" = encode(sha256(convert_to("token", 'UTF8')), 'hex'),
    "family_id" = gen_random_uuid(),
    "session_started_at" = "created_at"
WHERE "token_hash" IS NULL
  AND "token" IS NOT NULL
  AND "is_revoked" = false
  AND "expires_at" > (now() AT TIME ZONE 'UTC');

COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

COMMIT;
