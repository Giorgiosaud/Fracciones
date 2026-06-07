CREATE TABLE players (
  name TEXT PRIMARY KEY,
  best_streak INTEGER NOT NULL DEFAULT 0,
  best_accuracy INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
