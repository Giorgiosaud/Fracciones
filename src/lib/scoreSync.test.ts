import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitOrQueueScore, flushPendingScores, registerScoreSync } from './scoreSync'
import { loadPendingScores, enqueuePendingScore } from './scoreQueue'
import { submitScore } from './leaderboardApi'

vi.mock('./leaderboardApi', () => ({ submitScore: vi.fn() }))

const submission = (idempotencyKey: string) => ({
  name: 'Ana', questionLimit: 20, timerSeconds: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey,
})

beforeEach(() => {
  localStorage.clear()
  vi.mocked(submitScore).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('submitOrQueueScore', () => {
  it('does not queue the submission when it sends successfully', async () => {
    vi.mocked(submitScore).mockResolvedValue(true)
    await submitOrQueueScore(submission('a'))
    expect(loadPendingScores()).toEqual([])
  })

  it('queues the submission when sending fails', async () => {
    vi.mocked(submitScore).mockResolvedValue(false)
    await submitOrQueueScore(submission('a'))
    expect(loadPendingScores()).toEqual([submission('a')])
  })
})

describe('flushPendingScores', () => {
  it('removes queued entries that now send successfully', async () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    vi.mocked(submitScore).mockResolvedValue(true)
    await flushPendingScores()
    expect(loadPendingScores()).toEqual([])
    expect(submitScore).toHaveBeenCalledTimes(2)
  })

  it('keeps entries that still fail to send', async () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    vi.mocked(submitScore).mockImplementation(async (s) => s.idempotencyKey === 'a')
    await flushPendingScores()
    expect(loadPendingScores()).toEqual([submission('b')])
  })
})

describe('registerScoreSync', () => {
  it('flushes immediately and again on the "online" event, and unregisters via the returned cleanup', async () => {
    enqueuePendingScore(submission('a'))
    vi.mocked(submitScore).mockResolvedValue(true)

    const unregister = registerScoreSync()
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(1)

    enqueuePendingScore(submission('b'))
    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(2)

    unregister()
    enqueuePendingScore(submission('c'))
    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(2)
  })
})
