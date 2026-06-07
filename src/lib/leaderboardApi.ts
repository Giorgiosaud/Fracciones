import type { LeaderboardEntry } from './types'
import { getDeviceId } from './deviceId'

export interface ScoreSubmission {
  name: string
  questionLimit: number
  timerSeconds: number
  streak: number
  accuracy: number
  score: number
  total: number
  // Stable per-session identifier — lets the server ignore a retried/queued
  // submission instead of double-counting it (see worker/index.ts handleSubmit).
  idempotencyKey: string
}

export type NameAvailability = 'available' | 'taken' | 'unknown'

// The leaderboard is a nice-to-have on top of the local game — if the
// network is down or the API errors out, the game must keep working, so
// every call here swallows failures and returns a "no data"/"unknown" value
// instead of throwing.

// Checks whether `name` can be claimed by this device. 'unknown' means the
// check itself failed (offline, server error) — callers should treat that
// as "don't block the kid from playing".
export async function checkName(name: string): Promise<NameAvailability> {
  try {
    const params = new URLSearchParams({ name, token: getDeviceId() })
    const res = await fetch(`/api/leaderboard/check?${params.toString()}`)
    if (!res.ok) return 'unknown'
    const data = await res.json()
    if (typeof data?.available !== 'boolean') return 'unknown'
    return data.available ? 'available' : 'taken'
  } catch {
    return 'unknown'
  }
}

export async function submitScore(submission: ScoreSubmission): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...submission, ownerToken: getDeviceId() }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchTop(questionLimit: number, limit = 10): Promise<LeaderboardEntry[] | null> {
  try {
    const params = new URLSearchParams({ questionLimit: String(questionLimit), limit: String(limit) })
    const res = await fetch(`/api/leaderboard/top?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data?.entries) ? data.entries : null
  } catch {
    return null
  }
}
