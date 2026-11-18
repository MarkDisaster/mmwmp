BEGIN;
SET LOCAL lock_timeout = '5s';

DROP INDEX "runner_scores_hidden_nick_score_idx";

CREATE INDEX "runner_scores_hidden_score_created_at_id_idx" ON "runner_scores"("hidden", "score" DESC, "created_at", "id");

COMMIT;
