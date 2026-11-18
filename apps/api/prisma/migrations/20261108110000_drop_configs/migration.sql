BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "role_permissions" IN ACCESS EXCLUSIVE MODE;

DELETE FROM "role_permissions" WHERE "resource" = 'config';

DROP TABLE "configs";

CREATE TYPE "permission_resource_new" AS ENUM ('projects', 'services', 'tags', 'files', 'users', 'roles', 'contact', 'audit_logs', 'runner_scores');
ALTER TABLE "role_permissions"
   ALTER COLUMN "resource" TYPE "permission_resource_new"
   USING ("resource"::text::"permission_resource_new");
ALTER TYPE "permission_resource" RENAME TO "permission_resource_old";
ALTER TYPE "permission_resource_new" RENAME TO "permission_resource";
DROP TYPE "permission_resource_old";

COMMIT;
