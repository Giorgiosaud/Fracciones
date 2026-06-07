-- Splits the single `players` table into:
--   - `players`: global name ownership (one name = one device, across all configs)
--   - `scores`: per-(name, question_limit) leaderboard rows, so kids who play
--     "20 preguntas" only compete against other "20 preguntas" sessions.
-- There's negligible real data so far (this predates launch) — recreate clean.

DROP TABLE IF EXISTS players;

CREATE TABLE players (
  name TEXT PRIMARY KEY,
  owner_token TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE scores (
  name TEXT NOT NULL,
  question_limit INTEGER NOT NULL,
  best_streak INTEGER NOT NULL DEFAULT 0,
  best_accuracy INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (name, question_limit),
  FOREIGN KEY (name) REFERENCES players(name)
);
