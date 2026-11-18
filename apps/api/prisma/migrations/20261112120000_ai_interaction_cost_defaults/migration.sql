BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "ai_interactions" ALTER COLUMN "input_cost_cents" SET DEFAULT 0,
ALTER COLUMN "output_cost_cents" SET DEFAULT 0,
ALTER COLUMN "total_cost_cents" SET DEFAULT 0;

COMMIT;
