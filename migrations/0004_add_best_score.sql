-- Adds an arcade-style points score (streak-multiplied, computed client-side
-- the same way as VS-mode damage) so the leaderboard can rank by score
-- instead of raw accuracy, which is harder for kids to compare at a glance.

ALTER TABLE scores ADD COLUMN best_score INTEGER NOT NULL DEFAULT 0;
