ALTER TABLE "projects"
   ADD COLUMN "deleted_at" TIMESTAMP(3),
   ADD COLUMN "deleted_by_id" INTEGER,
   ADD COLUMN "original_slug" TEXT;

ALTER TABLE "services"
   ADD COLUMN "deleted_at" TIMESTAMP(3),
   ADD COLUMN "deleted_by_id" INTEGER,
   ADD COLUMN "original_slug" TEXT;

ALTER TABLE "projects"
   ADD CONSTRAINT "projects_trash_check"
   CHECK (("deleted_at" IS NULL) = ("original_slug" IS NULL));
ALTER TABLE "services"
   ADD CONSTRAINT "services_trash_check"
   CHECK (("deleted_at" IS NULL) = ("original_slug" IS NULL));

CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
CREATE INDEX "services_deleted_at_idx" ON "services"("deleted_at");

ALTER TABLE "projects" ADD CONSTRAINT "projects_deleted_by_id_fkey"
   FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_deleted_by_id_fkey"
   FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tags"
   ADD COLUMN "deleted_at" TIMESTAMP(3),
   ADD COLUMN "deleted_by_id" INTEGER,
   ADD COLUMN "original_name" TEXT,
   ADD COLUMN "original_slug" TEXT;
ALTER TABLE "tags"
   ADD CONSTRAINT "tags_trash_check"
   CHECK (("deleted_at" IS NULL) = ("original_slug" IS NULL)
      AND ("deleted_at" IS NULL) = ("original_name" IS NULL));
CREATE INDEX "tags_deleted_at_idx" ON "tags"("deleted_at");
ALTER TABLE "tags" ADD CONSTRAINT "tags_deleted_by_id_fkey"
   FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "files"
   ADD COLUMN "deleted_at" TIMESTAMP(3),
   ADD COLUMN "deleted_by_id" INTEGER;
CREATE INDEX "files_deleted_at_idx" ON "files"("deleted_at");
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_id_fkey"
   FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
