BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMP(3),
ADD COLUMN "deactivated_by_id" INTEGER;

ALTER TABLE "users" ADD CONSTRAINT "users_deactivated_by_id_fkey" FOREIGN KEY ("deactivated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
