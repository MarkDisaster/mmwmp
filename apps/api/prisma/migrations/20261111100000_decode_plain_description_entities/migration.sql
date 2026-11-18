UPDATE "project_translations"
SET "description" = REPLACE(REPLACE(REPLACE(REPLACE(
      regexp_replace("description", '</?[a-zA-Z][^>]*>', '', 'g'),
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&amp;', '&')
WHERE "description" ~ '</?[a-zA-Z]' OR "description" LIKE '%&%;%';

UPDATE "service_translations"
SET "description" = REPLACE(REPLACE(REPLACE(REPLACE(
      regexp_replace("description", '</?[a-zA-Z][^>]*>', '', 'g'),
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&amp;', '&')
WHERE "description" ~ '</?[a-zA-Z]' OR "description" LIKE '%&%;%';
