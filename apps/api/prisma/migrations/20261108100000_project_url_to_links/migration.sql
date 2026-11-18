BEGIN;
SET LOCAL lock_timeout = '5s';

WITH "main" AS (
   SELECT "id" AS "project_id", btrim("url") AS "url"
   FROM "projects"
   WHERE btrim("url") <> ''
),
"address" AS (
   SELECT a."url",
      CASE
         WHEN m IS NULL THEN a."url"
         ELSE lower(m[1]) || '://' || lower(m[2])
            || CASE
               WHEN m[3] IS NULL
                  OR (lower(m[1]) = 'http' AND m[3] = ':80')
                  OR (lower(m[1]) = 'https' AND m[3] = ':443') THEN ''
               ELSE m[3]
            END
            || CASE WHEN m[4] = '' OR left(m[4], 1) IN ('?', '#') THEN '/' ELSE '' END
            || m[4]
      END AS "href"
   FROM (
      SELECT "url" FROM "main"
      UNION
      SELECT "url" FROM "project_links"
   ) AS a,
   LATERAL regexp_match(a."url", '^([A-Za-z][A-Za-z0-9+.-]*)://([^/?#:]+)(:[0-9]+)?(.*)$') AS m
),
"copy" AS (
   SELECT l."id"
   FROM "project_links" AS l
   JOIN "main" AS mn ON mn."project_id" = l."project_id"
   JOIN "address" AS link_address ON link_address."url" = l."url"
   JOIN "address" AS main_address ON main_address."url" = mn."url"
   WHERE link_address."href" = main_address."href"
),
"removed" AS (
   DELETE FROM "project_links"
   WHERE "id" IN (SELECT "id" FROM "copy")
   RETURNING "project_id", "label", "sort_order", "id"
)
INSERT INTO "project_links" ("project_id", "label", "url", "sort_order")
SELECT mn."project_id",
   (
      SELECT NULLIF(btrim(r."label"), '')
      FROM "removed" AS r
      WHERE r."project_id" = mn."project_id" AND NULLIF(btrim(r."label"), '') IS NOT NULL
      ORDER BY r."sort_order", r."id"
      LIMIT 1
   ),
   mn."url",
   -1
FROM "main" AS mn;

UPDATE "project_links" AS l
SET "sort_order" = ordered."position"
FROM (
   SELECT pl."id",
      ROW_NUMBER() OVER (PARTITION BY pl."project_id" ORDER BY pl."sort_order", pl."id") - 1
         AS "position"
   FROM "project_links" AS pl
   JOIN "projects" AS p ON p."id" = pl."project_id"
   WHERE btrim(p."url") <> ''
) AS ordered
WHERE l."id" = ordered."id";

ALTER TABLE "projects" DROP COLUMN "url";

COMMIT;
