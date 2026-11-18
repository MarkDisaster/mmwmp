BEGIN;
SET LOCAL lock_timeout = '5s';

DELETE FROM "role_permissions" WHERE "resource" = 'tags' AND "action" = 'publish';

ALTER TABLE "tags" DROP COLUMN IF EXISTS "status", DROP COLUMN IF EXISTS "published_at";

COMMIT;
