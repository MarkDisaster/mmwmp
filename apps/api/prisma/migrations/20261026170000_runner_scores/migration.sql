CREATE TABLE "runner_scores" (
    "id" SERIAL NOT NULL,
    "nick" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "seconds" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "runner_scores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "runner_scores_hidden_nick_score_idx" ON "runner_scores"("hidden", "nick", "score");

CREATE INDEX "runner_scores_created_at_idx" ON "runner_scores"("created_at");
