BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'ongoing'
   ) THEN
      ALTER TABLE "projects" ADD COLUMN "ongoing" BOOLEAN NOT NULL DEFAULT false;

      UPDATE "projects" SET "ongoing" = true WHERE "start_year" IS NOT NULL AND "end_year" IS NULL;
   END IF;
END $$;

COMMIT;
