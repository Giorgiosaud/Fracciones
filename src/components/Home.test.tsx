import { type ReactNode, createElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from './Home'
import { checkName } from '../lib/leaderboardApi'

vi.mock('framer-motion', () => {
  const passthrough = (Tag: string) =>
    ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) => {
      const { initial: _initial, animate: _animate, exit: _exit, whileTap: _whileTap, whileHover: _whileHover, transition: _transition, ...rest } = props
      return createElement(Tag, rest, children)
    }
  return {
    motion: new Proxy({}, { get: (_target, tag: string) => passthrough(tag) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
  }
})

vi.mock('../lib/leaderboardApi', () => ({ checkName: vi.fn(), fetchTop: vi.fn().mockResolvedValue([]) }))
vi.mock('./Leaderboard', () => ({ default: () => createElement('div', null, 'TOP JUGADORES') }))

const selectSoloMode = () => fireEvent.click(screen.getByText('PRÁCTICA SOLO'))
const nameInput = () => screen.getByPlaceholderText('Tu nombre')
const playButton = () => screen.getByText('¡JUGAR!')

beforeEach(() => {
  localStorage.clear()
  vi.mocked(checkName).mockReset()
})

describe('Home — solo mode name validation', () => {
  it('blocks starting without a name and shows a message', async () => {
    const onStart = vi.fn()
    render(<Home onStart={onStart} />)
    selectSoloMode()

    fireEvent.click(playButton())

    expect(await screen.findByText('Escribe tu nombre para aparecer en la tabla de posiciones')).toBeInTheDocument()
    expect(onStart).not.toHaveBeenCalled()
    expect(checkName).not.toHaveBeenCalled()
  })

  it('blocks starting when the name is already taken by someone else', async () => {
    vi.mocked(checkName).mockResolvedValue('taken')
    const onStart = vi.fn()
    render(<Home onStart={onStart} />)
    selectSoloMode()

    fireEvent.change(nameInput(), { target: { value: 'Ana' } })
    fireEvent.click(playButton())

    expect(await screen.findByText('Ese nombre ya lo usa alguien más — prueba con otro')).toBeInTheDocument()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('starts the game when the name is available', async () => {
    vi.mocked(checkName).mockResolvedValue('available')
    const onStart = vi.fn()
    render(<Home onStart={onStart} />)
    selectSoloMode()

    fireEvent.change(nameInput(), { target: { value: 'Ana' } })
    fireEvent.click(playButton())

    await waitFor(() => expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ mode: 'solo', player1Name: 'Ana' })))
  })

  it('starts the game when the availability check is inconclusive (offline)', async () => {
    vi.mocked(checkName).mockResolvedValue('unknown')
    const onStart = vi.fn()
    render(<Home onStart={onStart} />)
    selectSoloMode()

    fireEvent.change(nameInput(), { target: { value: 'Ana' } })
    fireEvent.click(playButton())

    await waitFor(() => expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ mode: 'solo', player1Name: 'Ana' })))
  })
})
