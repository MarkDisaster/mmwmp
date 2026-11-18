BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "users" ADD COLUMN "sessions_valid_after" TIMESTAMP(3);

COMMIT;
