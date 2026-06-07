-- Tracks the per-question timer setting that produced each player's best
-- score, so the leaderboard can show a "time" column — kids can see whether
-- a high score was set under time pressure or with no limit (which scores
-- at half rate), making it clearer what they're competing against.
ALTER TABLE scores ADD COLUMN best_timer_seconds INTEGER NOT NULL DEFAULT 60;
