ALTER TABLE "tags" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tags" ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "tags" SET "updated_at" = "created_at";
UPDATE "tags" SET "sort_order" = ordered.position
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "name") - 1 AS position FROM "tags") AS ordered
WHERE "tags"."id" = ordered."id";

ALTER TABLE "tags" ALTER COLUMN "updated_at" SET NOT NULL;
