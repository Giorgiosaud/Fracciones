import type { ScoreSubmission } from './leaderboardApi'
import { submitScore } from './leaderboardApi'
import { enqueuePendingScore, loadPendingScores, removePendingScore } from './scoreQueue'

// Tries to submit immediately; if that fails (offline/server error), queues
// the score so flushPendingScores can retry it once connectivity returns.
// Never throws — the leaderboard is a bonus, not a blocker for exiting.
export async function submitOrQueueScore(submission: ScoreSubmission): Promise<void> {
  const ok = await submitScore(submission)
  if (!ok) enqueuePendingScore(submission)
}

// Retries every queued score; each success is removed from the queue.
// Safe to call repeatedly — the idempotency key lets the server ignore
// duplicates, so re-flushing an already-sent entry is harmless.
export async function flushPendingScores(): Promise<void> {
  for (const submission of loadPendingScores()) {
    if (await submitScore(submission)) removePendingScore(submission.idempotencyKey)
  }
}

// Wires up automatic retry: once immediately (covers "app reopened while
// online with stale queue entries") and again whenever the browser regains
// connectivity. Returns a cleanup function that removes the listener.
export function registerScoreSync(): () => void {
  void flushPendingScores()
  const handleOnline = () => { void flushPendingScores() }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}
