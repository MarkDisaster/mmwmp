ALTER TABLE "projects" ADD CONSTRAINT "projects_year_range_check" CHECK ("end_year" IS NULL OR ("start_year" IS NOT NULL AND "end_year" >= "start_year"));
