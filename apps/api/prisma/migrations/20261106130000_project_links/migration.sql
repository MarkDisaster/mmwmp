CREATE TABLE "project_links" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_links_project_id_idx" ON "project_links"("project_id");

ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
