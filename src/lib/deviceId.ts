const KEY = 'fracciones:deviceId'

// A silent per-device identifier used to "claim" a leaderboard name —
// no accounts, no login, just enough to stop two kids from overwriting
// each other's scores if they pick the same name on different devices.
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return ''
  }
}
