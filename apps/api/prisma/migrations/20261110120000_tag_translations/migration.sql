BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "tag_translations" (
    "id" SERIAL NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "language" "language" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tag_translations_tag_id_language_key" ON "tag_translations"("tag_id", "language");

DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tag_translations_tag_id_fkey') THEN
      ALTER TABLE "tag_translations" ADD CONSTRAINT "tag_translations_tag_id_fkey"
         FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF;
END $$;

DO $$
BEGIN
   IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'tags' AND column_name = 'name'
   ) THEN
      INSERT INTO "tag_translations" ("tag_id", "language", "name")
      SELECT "id", 'cs', COALESCE("original_name", "name") FROM "tags"
      ON CONFLICT ("tag_id", "language") DO NOTHING;

      ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_trash_check";
      ALTER TABLE "tags" DROP COLUMN "name", DROP COLUMN "original_name";
      ALTER TABLE "tags" ADD CONSTRAINT "tags_trash_check"
         CHECK (("deleted_at" IS NULL) = ("original_slug" IS NULL));
   END IF;
END $$;

COMMIT;
