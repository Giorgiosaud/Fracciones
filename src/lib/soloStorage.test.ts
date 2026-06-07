import { describe, it, expect, beforeEach } from 'vitest'
import { loadSoloHighScore, saveSoloHighScore } from './soloStorage'

beforeEach(() => {
  localStorage.clear()
})

describe('loadSoloHighScore', () => {
  it('returns an empty record when nothing is stored', () => {
    expect(loadSoloHighScore()).toEqual({ bestStreak: 0, bestAccuracy: 0, totalSessions: 0, updatedAt: '' })
  })

  it('returns an empty record when stored data is malformed', () => {
    localStorage.setItem('fracciones:soloHighScore', '{"not":"valid"}')
    expect(loadSoloHighScore()).toEqual({ bestStreak: 0, bestAccuracy: 0, totalSessions: 0, updatedAt: '' })
  })

  it('returns an empty record when stored JSON is corrupt', () => {
    localStorage.setItem('fracciones:soloHighScore', 'not json{{{')
    expect(loadSoloHighScore()).toEqual({ bestStreak: 0, bestAccuracy: 0, totalSessions: 0, updatedAt: '' })
  })

  it('round-trips a previously saved record', () => {
    saveSoloHighScore(loadSoloHighScore(), { streak: 5, correct: 9, total: 10 })
    const loaded = loadSoloHighScore()
    expect(loaded.bestStreak).toBe(5)
    expect(loaded.bestAccuracy).toBe(90)
    expect(loaded.totalSessions).toBe(1)
  })
})

describe('saveSoloHighScore', () => {
  it('keeps the highest streak across sessions', () => {
    let record = loadSoloHighScore()
    record = saveSoloHighScore(record, { streak: 3, correct: 12, total: 15 })
    record = saveSoloHighScore(record, { streak: 1, correct: 8, total: 12 })
    expect(record.bestStreak).toBe(3)
  })

  it('only updates accuracy once the minimum sample size is reached', () => {
    let record = loadSoloHighScore()
    // Lucky 1/1 = 100% should not set the record
    record = saveSoloHighScore(record, { streak: 1, correct: 1, total: 1 })
    expect(record.bestAccuracy).toBe(0)
    // 8/10 = 80% should set the record (meets the threshold)
    record = saveSoloHighScore(record, { streak: 2, correct: 8, total: 10 })
    expect(record.bestAccuracy).toBe(80)
  })

  it('keeps the highest accuracy across sessions', () => {
    let record = loadSoloHighScore()
    record = saveSoloHighScore(record, { streak: 1, correct: 9, total: 10 })
    record = saveSoloHighScore(record, { streak: 1, correct: 5, total: 10 })
    expect(record.bestAccuracy).toBe(90)
  })

  it('increments the session count and stamps an updated date', () => {
    let record = loadSoloHighScore()
    record = saveSoloHighScore(record, { streak: 1, correct: 1, total: 2 })
    record = saveSoloHighScore(record, { streak: 1, correct: 1, total: 2 })
    expect(record.totalSessions).toBe(2)
    expect(record.updatedAt).not.toBe('')
  })

  it('persists to localStorage', () => {
    saveSoloHighScore(loadSoloHighScore(), { streak: 4, correct: 7, total: 10 })
    const raw = localStorage.getItem('fracciones:soloHighScore')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).bestStreak).toBe(4)
  })
})
