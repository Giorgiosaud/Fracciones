const KEY = 'fracciones-vs-wins'

export interface WinRecord {
  name: string
  wins: number
}

export function loadWins(): WinRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function recordWin(winnerName: string): WinRecord[] {
  const records = loadWins()
  const existing = records.find(r => r.name === winnerName)
  if (existing) {
    existing.wins += 1
  } else {
    records.push({ name: winnerName, wins: 1 })
  }
  records.sort((a, b) => b.wins - a.wins)
  localStorage.setItem(KEY, JSON.stringify(records))
  return records
}

export function clearWins(): void {
  localStorage.removeItem(KEY)
}
