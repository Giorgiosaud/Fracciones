import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SoloGame from './SoloGame'
import type { Exercise, GameConfig } from '../lib/types'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// framer-motion's exit/enter animations never resolve under fake timers
// (they're driven by rAF, not setTimeout), which leaves stale "exiting"
// elements mounted and breaks interaction-based assertions. Render plain
// elements/fragments instead so state transitions happen synchronously.
vi.mock('framer-motion', () => {
  const passthrough = (Tag: string) =>
    ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) => {
      const { initial: _initial, animate: _animate, exit: _exit, whileTap: _whileTap, onAnimationComplete: _onAnimationComplete, ...rest } = props
      return createElement(Tag, rest, children)
    }
  return {
    motion: new Proxy({}, { get: (_target, tag: string) => passthrough(tag) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  }
})

vi.mock('../hooks/useSoundFX', () => ({
  useSoundFX: () => ({
    playBuzzer: vi.fn(),
    playCorrect: vi.fn(),
    playWrong: vi.fn(),
    playStreakHit: vi.fn(),
    playDamage: vi.fn(),
    playComebackActivate: vi.fn(),
    playComebackTick: vi.fn(),
    playComebackSuccess: vi.fn(),
    playComebackFail: vi.fn(),
  }),
}))

vi.mock('../hooks/useBGM', () => ({
  useBGM: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    setDanger: vi.fn(),
    setStreak: vi.fn(),
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
    muted: false,
    volume: 1,
  }),
}))

const FIXED_JOKE = { setup: '¿Por qué?', punchline: '¡Porque sí!' }
vi.mock('../lib/jokes', () => ({ getRandomJoke: () => FIXED_JOKE }))

const submitScore = vi.fn().mockResolvedValue(true)
vi.mock('../lib/leaderboardApi', () => ({ submitScore: (...args: unknown[]) => submitScore(...args) }))

// Leaderboard fetches on mount and renders async state — irrelevant to
// SoloGame's own behavior, so render a static placeholder instead.
vi.mock('./Leaderboard', () => ({ default: () => <div>TOP JUGADORES</div> }))

const makeExercise = (): Exercise => ({
  type: 'mixed',
  fractionA: { numerator: 1, denominator: 2 },
  answer: '1/2',
  displayAnswer: '1/2',
  options: ['1/2', '1/3', '1/4'],
})

vi.mock('../lib/exercises', () => ({
  generateExercise: () => makeExercise(),
  validateAnswer: (exercise: Exercise, userInput: string) => userInput === String(exercise.answer),
}))

const config: GameConfig = {
  mode: 'solo' as GameConfig['mode'],
  player1Name: 'Jugador',
  player2Name: '',
  pointsToWin: 5,
  timerSeconds: 30,
  questionLimit: 20,
}

const HIGHSCORE_KEY = 'fracciones:soloHighScore'

beforeEach(() => {
  localStorage.clear()
  submitScore.mockClear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Options render fractions as split spans (e.g. "1" over "2"), so target by
// their accessible "Opción N" title rather than the raw "1/2" text.
const answerByPosition = (position: number) => fireEvent.click(screen.getByTitle(`Opción ${position}`))
const CORRECT_OPTION = 1 // makeExercise() places '1/2' (the answer) first
const WRONG_OPTION = 2
// Progression is manual now — the player must press "CONTINUAR" after seeing
// feedback (no more auto-advance timeout).
const advanceToNextRound = () => fireEvent.click(screen.getByText('CONTINUAR'))

describe('SoloGame', () => {
  it('renders the exercise and stats header', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)
    expect(screen.getByText('SALIR')).toBeInTheDocument()
    expect(screen.getByText('CORRECTAS')).toBeInTheDocument()
    expect(screen.getByText('Convierte a número mixto')).toBeInTheDocument()
  })

  it.each([
    { label: 'correct', position: CORRECT_OPTION, score: '1/1', streak: '1 🔥' },
    { label: 'wrong', position: WRONG_OPTION, score: '0/1', streak: '0 🔥' },
  ])('records a $label answer in the score and streak', ({ position, score, streak }) => {
    render(<SoloGame config={config} onExit={vi.fn()} />)
    answerByPosition(position)

    expect(screen.getByText(score)).toBeInTheDocument()
    expect(screen.getByText(streak)).toBeInTheDocument()
  })

  it.each([
    { key: '1', expected: '1/1' },
    { key: '2', expected: '0/1' },
  ])('selects an option via the "$key" number key', ({ key, expected }) => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    fireEvent.keyDown(window, { key })

    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('waits for "CONTINUAR" instead of auto-advancing after an answer', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)
    answerByPosition(CORRECT_OPTION)

    // Feedback is shown and progression is gated behind a manual button —
    // letting time pass on its own must not advance the round.
    const continueButton = screen.getByText('CONTINUAR')
    act(() => { vi.advanceTimersByTime(10000) })
    expect(screen.getByText('CONTINUAR')).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()

    fireEvent.click(continueButton)
    expect(screen.queryByText('CONTINUAR')).not.toBeInTheDocument()
  })

  it('ignores further selections once an answer has been chosen', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)
    answerByPosition(WRONG_OPTION)
    answerByPosition(CORRECT_OPTION)

    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('shows the joke overlay every third round and closes it without leaving it stuck', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    // Rounds 1 and 2: answer to advance without triggering a joke (round % 3 !== 0).
    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()
    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()

    // Round 3 triggers the joke overlay.
    expect(screen.getByText(FIXED_JOKE.setup)).toBeInTheDocument()
    expect(screen.getByText(FIXED_JOKE.punchline)).toBeInTheDocument()

    fireEvent.click(screen.getByText('¡SIGUIENTE!'))

    // Regression: the overlay must be dismissed when closed manually, not left stuck on screen.
    expect(screen.queryByText(FIXED_JOKE.setup)).not.toBeInTheDocument()
    expect(screen.queryByText(FIXED_JOKE.punchline)).not.toBeInTheDocument()
  })

  it('auto-dismisses the joke and advances after the timeout', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()
    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()

    expect(screen.getByText(FIXED_JOKE.setup)).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(15000) })

    expect(screen.queryByText(FIXED_JOKE.setup)).not.toBeInTheDocument()
  })

  it('opens the game-over screen and allows restarting practice', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    fireEvent.click(screen.getByText('SALIR'))
    expect(screen.getByText('FIN DE LA PARTIDA')).toBeInTheDocument()

    fireEvent.click(screen.getByText('REINICIAR'))
    expect(screen.queryByText('FIN DE LA PARTIDA')).not.toBeInTheDocument()
  })

  it('persists the high score and exits when leaving from the summary', () => {
    const onExit = vi.fn()
    render(<SoloGame config={config} onExit={onExit} />)

    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()

    fireEvent.click(screen.getByText('SALIR'))
    fireEvent.click(screen.getByText('VOLVER AL INICIO'))

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(HIGHSCORE_KEY)).not.toBeNull()
  })

  it('submits the session score to the leaderboard as soon as the game ends', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()

    fireEvent.click(screen.getByText('SALIR'))

    // timerSeconds: 30 → timer multiplier ×1.3, streak 1 → no streak bonus: round(10 × 1.3) = 13
    expect(submitScore).toHaveBeenCalledWith({ name: 'Jugador', questionLimit: 20, streak: 1, accuracy: 100, score: 13, total: 1 })
  })

  it('rewards harder (shorter) timer settings with a higher score multiplier', () => {
    const harderConfig: GameConfig = { ...config, timerSeconds: 10 }
    render(<SoloGame config={harderConfig} onExit={vi.fn()} />)

    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()

    fireEvent.click(screen.getByText('SALIR'))

    // timerSeconds: 10 → timer multiplier ×1.5, streak 1 → no streak bonus: round(10 × 1.5) = 15
    expect(submitScore).toHaveBeenCalledWith({ name: 'Jugador', questionLimit: 20, streak: 1, accuracy: 100, score: 15, total: 1 })
  })

  it('shows the live score and streak multiplier badge in the header', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()
    answerByPosition(CORRECT_OPTION)
    advanceToNextRound()
    // Round 3 triggers a joke screen — dismiss it before answering again.
    fireEvent.click(screen.getByText('¡SIGUIENTE!'))
    answerByPosition(CORRECT_OPTION)

    expect(screen.getByText('×1.1', { exact: false })).toBeInTheDocument()
  })

  it('shows the leaderboard in the game-over screen', () => {
    render(<SoloGame config={config} onExit={vi.fn()} />)

    fireEvent.click(screen.getByText('SALIR'))

    expect(screen.getByText('TOP JUGADORES')).toBeInTheDocument()
  })
})
