import type { SoloHighScore } from './types'

const KEY = 'fracciones:soloHighScore'
const MIN_ATTEMPTS_FOR_ACCURACY = 10

const EMPTY: SoloHighScore = { bestStreak: 0, bestAccuracy: 0, totalSessions: 0, updatedAt: '' }

export function loadSoloHighScore(): SoloHighScore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.bestStreak !== 'number' ||
      typeof parsed?.bestAccuracy !== 'number' ||
      typeof parsed?.totalSessions !== 'number'
    ) return { ...EMPTY }
    return { ...EMPTY, ...parsed }
  } catch {
    return { ...EMPTY }
  }
}

// Persists the session's results, keeping the best streak/accuracy ever seen.
// Accuracy only updates once enough questions were answered to be meaningful.
export function saveSoloHighScore(record: SoloHighScore, session: { streak: number; correct: number; total: number }): SoloHighScore {
  const next: SoloHighScore = {
    bestStreak: Math.max(record.bestStreak, session.streak),
    bestAccuracy: session.total >= MIN_ATTEMPTS_FOR_ACCURACY
      ? Math.max(record.bestAccuracy, Math.round((session.correct / session.total) * 100))
      : record.bestAccuracy,
    totalSessions: record.totalSessions + 1,
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable (private browsing / quota) — ignore
  }
  return next
}
