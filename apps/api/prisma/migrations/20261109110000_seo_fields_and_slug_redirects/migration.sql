CREATE TYPE "slug_redirect_resource" AS ENUM ('project', 'service');

ALTER TABLE "service_translations" ADD COLUMN     "meta_description" TEXT,
ADD COLUMN     "meta_title" TEXT;

ALTER TABLE "files" ADD COLUMN     "alt_text" TEXT;

CREATE TABLE "slug_redirects" (
    "id" SERIAL NOT NULL,
    "resource" "slug_redirect_resource" NOT NULL,
    "old_slug" TEXT NOT NULL,
    "target_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_redirects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "slug_redirects_resource_target_id_idx" ON "slug_redirects"("resource", "target_id");

CREATE UNIQUE INDEX "slug_redirects_resource_old_slug_key" ON "slug_redirects"("resource", "old_slug");
