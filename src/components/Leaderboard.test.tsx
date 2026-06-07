import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Leaderboard from './Leaderboard'
import { fetchTop } from '../lib/leaderboardApi'
import type { LeaderboardEntry } from '../lib/types'

vi.mock('../lib/leaderboardApi', () => ({ fetchTop: vi.fn() }))

const ENTRIES: LeaderboardEntry[] = [
  { name: 'Ana', bestStreak: 12, bestAccuracy: 90, bestScore: 320, totalSessions: 4 },
  { name: 'Beto', bestStreak: 8, bestAccuracy: 75, bestScore: 210, totalSessions: 2 },
]

beforeEach(() => {
  vi.mocked(fetchTop).mockReset()
})

describe('Leaderboard', () => {
  it('renders the ranked entries once loaded', async () => {
    vi.mocked(fetchTop).mockResolvedValue(ENTRIES)
    render(<Leaderboard questionLimit={20} />)

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Beto')).toBeInTheDocument()
    expect(screen.getByText('320 pts', { exact: false })).toBeInTheDocument()
  })

  it('shows an empty state when there are no entries yet', async () => {
    vi.mocked(fetchTop).mockResolvedValue([])
    render(<Leaderboard questionLimit={20} />)

    expect(await screen.findByText('¡Sé el primero en aparecer aquí!')).toBeInTheDocument()
  })

  it('shows an error state when the leaderboard cannot be loaded', async () => {
    vi.mocked(fetchTop).mockResolvedValue(null)
    render(<Leaderboard questionLimit={20} />)

    await waitFor(() => expect(screen.getByText('No se pudo cargar la tabla.')).toBeInTheDocument())
  })

  it('requests the given limit', () => {
    vi.mocked(fetchTop).mockResolvedValue([])
    render(<Leaderboard questionLimit={20} limit={5} />)

    expect(fetchTop).toHaveBeenCalledWith(20, 5)
  })
})
