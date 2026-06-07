import { describe, it, expect, beforeEach } from 'vitest'
import { loadPendingScores, enqueuePendingScore, removePendingScore } from './scoreQueue'

const submission = (idempotencyKey: string) => ({
  name: 'Ana', questionLimit: 20, timerSeconds: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey,
})

beforeEach(() => {
  localStorage.clear()
})

describe('loadPendingScores', () => {
  it('returns an empty queue when nothing is stored', () => {
    expect(loadPendingScores()).toEqual([])
  })

  it('returns an empty queue when stored data is malformed', () => {
    localStorage.setItem('fracciones:pendingScores', '{"not":"an array"}')
    expect(loadPendingScores()).toEqual([])
  })

  it('returns an empty queue when stored JSON is corrupt', () => {
    localStorage.setItem('fracciones:pendingScores', 'not json{{{')
    expect(loadPendingScores()).toEqual([])
  })

  it('drops entries that are missing required fields', () => {
    localStorage.setItem('fracciones:pendingScores', JSON.stringify([{ name: 'Ana' }, submission('valid-1')]))
    expect(loadPendingScores()).toEqual([submission('valid-1')])
  })
})

describe('enqueuePendingScore', () => {
  it('adds a submission and persists it', () => {
    enqueuePendingScore(submission('a'))
    expect(loadPendingScores()).toEqual([submission('a')])
  })

  it('replaces an existing entry with the same idempotency key instead of duplicating it', () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore({ ...submission('a'), streak: 9 })
    const queue = loadPendingScores()
    expect(queue).toHaveLength(1)
    expect(queue[0].streak).toBe(9)
  })

  it('caps the queue at the most recent 20 entries', () => {
    for (let i = 0; i < 25; i++) enqueuePendingScore(submission(`key-${i}`))
    const queue = loadPendingScores()
    expect(queue).toHaveLength(20)
    expect(queue[0].idempotencyKey).toBe('key-5')
    expect(queue[19].idempotencyKey).toBe('key-24')
  })
})

describe('removePendingScore', () => {
  it('removes only the matching entry', () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    removePendingScore('a')
    expect(loadPendingScores()).toEqual([submission('b')])
  })

  it('does nothing when the key is not present', () => {
    enqueuePendingScore(submission('a'))
    removePendingScore('missing')
    expect(loadPendingScores()).toEqual([submission('a')])
  })
})
