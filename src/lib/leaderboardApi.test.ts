import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkName, submitScore, fetchTop } from './leaderboardApi'

vi.mock('./deviceId', () => ({ getDeviceId: () => 'device-123' }))

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(body),
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkName', () => {
  it('returns "available" when the server says the name is free', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ available: true }) as Response)
    expect(await checkName('Ana')).toBe('available')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/leaderboard/check?'))
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('token=device-123'))
  })

  it('returns "taken" when the server says the name is claimed by someone else', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ available: false }) as Response)
    expect(await checkName('Ana')).toBe('taken')
  })

  it.each([
    ['a non-ok response', jsonResponse({ available: true }, false)],
    ['a malformed payload', jsonResponse({ nope: true })],
  ])('returns "unknown" on %s', async (_label, response) => {
    vi.mocked(fetch).mockResolvedValue(response as Response)
    expect(await checkName('Ana')).toBe('unknown')
  })

  it('returns "unknown" when the request throws (offline)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    expect(await checkName('Ana')).toBe('unknown')
  })
})

describe('submitScore', () => {
  const submission = { name: 'Ana', questionLimit: 20, timerSeconds: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey: 'session-abc' }

  it('posts the submission with the device token and returns true on success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
    expect(await submitScore(submission)).toBe(true)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/leaderboard/submit')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ ...submission, ownerToken: 'device-123' })
  })

  it('returns false when the server responds with an error status', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    expect(await submitScore(submission)).toBe(false)
  })

  it('returns false when the request throws (offline)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    expect(await submitScore(submission)).toBe(false)
  })
})

describe('fetchTop', () => {
  it('returns the entries array on success', async () => {
    const entries = [{ name: 'Ana', bestStreak: 9, bestAccuracy: 90, totalSessions: 3 }]
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ entries }) as Response)
    expect(await fetchTop(20)).toEqual(entries)
  })

  it.each([
    ['a non-ok response', jsonResponse({ entries: [] }, false), null],
    ['a malformed payload', jsonResponse({ nope: true }), null],
  ])('returns null on %s', async (_label, response, expected) => {
    vi.mocked(fetch).mockResolvedValue(response as Response)
    expect(await fetchTop(20)).toBe(expected)
  })

  it('returns null when the request throws (offline)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    expect(await fetchTop(20)).toBeNull()
  })
})
