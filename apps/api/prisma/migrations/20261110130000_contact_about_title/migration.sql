BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "contact_translations" ADD COLUMN IF NOT EXISTS "about_title" TEXT;

COMMIT;
