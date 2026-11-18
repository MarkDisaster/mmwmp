BEGIN;
SET LOCAL lock_timeout = '5s';

LOCK TABLE "users" IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
   collisions TEXT;
BEGIN
   SELECT string_agg(ids, '; ')
   INTO collisions
   FROM (
      SELECT string_agg("id"::TEXT, ', ' ORDER BY "id") AS ids
      FROM "users"
      GROUP BY lower(btrim("email"))
      HAVING count(*) > 1
   ) AS colliding;

   IF collisions IS NOT NULL THEN
      RAISE EXCEPTION 'users: emails that differ only in case or surrounding spaces (user ids: %)', collisions
         USING HINT = 'Nothing was changed. Rename or delete one account of each group, run prisma migrate resolve --rolled-back 20261111150000_user_email_normalized and deploy again.';
   END IF;

   UPDATE "users" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'users_email_normalized_check' AND conrelid = '"users"'::REGCLASS
   ) THEN
      ALTER TABLE "users"
         ADD CONSTRAINT "users_email_normalized_check" CHECK ("email" = lower(btrim("email")));
   END IF;
END $$;

COMMIT;
