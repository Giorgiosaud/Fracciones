import type { ScoreSubmission } from './leaderboardApi'

const KEY = 'fracciones:pendingScores'
const MAX_QUEUE_SIZE = 20

function isScoreSubmission(value: unknown): value is ScoreSubmission {
  const s = value as Record<string, unknown> | null
  return (
    !!s &&
    typeof s.idempotencyKey === 'string' &&
    typeof s.name === 'string' &&
    typeof s.questionLimit === 'number' &&
    typeof s.streak === 'number' &&
    typeof s.accuracy === 'number' &&
    typeof s.score === 'number' &&
    typeof s.total === 'number'
  )
}

export function loadPendingScores(): ScoreSubmission[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isScoreSubmission) : []
  } catch {
    return []
  }
}

function persist(queue: ScoreSubmission[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    // localStorage unavailable (private browsing / quota) — the score is
    // lost, but that must never block gameplay.
  }
}

// Queues a submission that failed to send so flushPendingScores can retry it
// once back online. Re-enqueuing the same session (same idempotencyKey)
// replaces the stale entry rather than duplicating it. Capped to the most
// recent MAX_QUEUE_SIZE — an offline kid playing for hours shouldn't grow
// this without bound.
export function enqueuePendingScore(submission: ScoreSubmission): void {
  const queue = loadPendingScores().filter(s => s.idempotencyKey !== submission.idempotencyKey)
  queue.push(submission)
  persist(queue.slice(-MAX_QUEUE_SIZE))
}

export function removePendingScore(idempotencyKey: string): void {
  persist(loadPendingScores().filter(s => s.idempotencyKey !== idempotencyKey))
}
