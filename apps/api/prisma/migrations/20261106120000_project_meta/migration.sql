ALTER TABLE "projects" ADD COLUMN     "company" TEXT,
ADD COLUMN     "end_year" INTEGER,
ADD COLUMN     "start_year" INTEGER;

ALTER TABLE "project_translations" ADD COLUMN     "role" TEXT;
