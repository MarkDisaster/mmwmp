BEGIN;

CREATE TYPE "entity_status" AS ENUM ('draft', 'published');

CREATE TYPE "language" AS ENUM ('cs', 'en');

CREATE TYPE "file_processing_status" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TYPE "file_variant_type" AS ENUM ('thumbnail', 'medium', 'large', 'original');

CREATE TYPE "permission_action" AS ENUM ('read', 'create', 'update', 'delete', 'publish');

CREATE TYPE "permission_resource" AS ENUM ('projects', 'services', 'tags', 'files', 'users', 'roles', 'config', 'contact', 'audit_logs', 'runner_scores');

CREATE TYPE "audit_actor_type" AS ENUM ('user', 'ai', 'system');

UPDATE "audit_logs" SET "actor_type" = 'user' WHERE "actor_type" = 'admin';

ALTER TABLE "audit_logs"
   ALTER COLUMN "actor_type" TYPE "audit_actor_type" USING ("actor_type"::"audit_actor_type");

ALTER TABLE "contact_translations"
   ALTER COLUMN "language" TYPE "language" USING ("language"::"language");

ALTER TABLE "file_variants"
   ALTER COLUMN "variant" TYPE "file_variant_type" USING ("variant"::"file_variant_type");

ALTER TABLE "files"
   ALTER COLUMN "processing_status" DROP DEFAULT,
   ALTER COLUMN "language" TYPE "language" USING ("language"::"language"),
   ALTER COLUMN "processing_status" TYPE "file_processing_status" USING ("processing_status"::"file_processing_status"),
   ALTER COLUMN "processing_status" SET DEFAULT 'READY';

ALTER TABLE "project_media"
   ALTER COLUMN "language" TYPE "language" USING ("language"::"language");

ALTER TABLE "project_translations"
   ALTER COLUMN "language" TYPE "language" USING ("language"::"language");

ALTER TABLE "projects"
   ALTER COLUMN "status" DROP DEFAULT,
   ALTER COLUMN "status" TYPE "entity_status" USING ("status"::"entity_status"),
   ALTER COLUMN "status" SET DEFAULT 'draft';

ALTER TABLE "role_permissions"
   ALTER COLUMN "resource" TYPE "permission_resource" USING ("resource"::"permission_resource"),
   ALTER COLUMN "action" TYPE "permission_action" USING ("action"::"permission_action");

ALTER TABLE "service_translations"
   ALTER COLUMN "language" TYPE "language" USING ("language"::"language");

ALTER TABLE "services"
   ALTER COLUMN "status" DROP DEFAULT,
   ALTER COLUMN "status" TYPE "entity_status" USING ("status"::"entity_status"),
   ALTER COLUMN "status" SET DEFAULT 'draft';

ALTER TABLE "tags"
   ALTER COLUMN "status" DROP DEFAULT,
   ALTER COLUMN "status" TYPE "entity_status" USING ("status"::"entity_status"),
   ALTER COLUMN "status" SET DEFAULT 'draft';

COMMIT;
