import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceId } from './deviceId'

const KEY = 'fracciones:deviceId'

beforeEach(() => {
  localStorage.clear()
})

describe('getDeviceId', () => {
  it('generates and persists an id on first call', () => {
    const id = getDeviceId()
    expect(id).toBeTruthy()
    expect(localStorage.getItem(KEY)).toBe(id)
  })

  it('returns the same id on subsequent calls', () => {
    const first = getDeviceId()
    const second = getDeviceId()
    expect(second).toBe(first)
  })
})
