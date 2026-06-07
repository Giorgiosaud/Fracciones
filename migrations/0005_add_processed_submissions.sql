-- Tracks which score submissions have already been applied to `scores`, so
-- a retried/queued offline submission (same idempotency key) can be safely
-- re-sent without double-incrementing total_sessions.
CREATE TABLE processed_submissions (
  idempotency_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
