BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'messages' AND column_name = 'updated_at'
   ) THEN
      ALTER TABLE "messages" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "messages" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

      UPDATE "messages" SET "updated_at" = "created_at";
   END IF;
END $$;

COMMIT;
