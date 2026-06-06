import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Exercise, GameConfig, PlayerKey, Scores } from '../lib/types'
import { generateExercise, validateAnswer } from '../lib/exercises'
import FractionVisualizer from './FractionVisualizer'
import BuzzerIndicator from './BuzzerIndicator'
import Timer from './Timer'
import HealthBar from './HealthBar'

interface Props {
  config: GameConfig
  onGameEnd: (scores: Scores, config: GameConfig, winner: PlayerKey) => void
}

type Phase = 'waiting' | 'locked' | 'showing-result'

const MAX_HP = 100
const DAMAGE = 25
const HEAL_STREAK = 15
const COMEBACK_NEEDED = 3
const COMEBACK_HP = 40

function FractionDisplay({ frac }: { frac: { numerator: number; denominator: number } }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span>{frac.numerator}</span>
      <span className="w-full border-t-2 border-white my-1" />
      <span>{frac.denominator}</span>
    </span>
  )
}

function renderExercise(ex: Exercise) {
  if (ex.type === 'compare') {
    return (
      <div className="flex items-center gap-6 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400 text-5xl w-12 text-center">___</span>
        <FractionDisplay frac={ex.fractionB!} />
      </div>
    )
  }
  if (ex.type === 'simplify') {
    return (
      <div className="flex items-center gap-4 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400">=</span>
        <span className="text-indigo-400 text-5xl">?</span>
      </div>
    )
  }
  if (ex.type === 'amplify') {
    return (
      <div className="flex items-center gap-4 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400">=</span>
        <div className="flex flex-col items-center leading-none">
          <span className="text-indigo-400">?</span>
          <span className="w-full border-t-2 border-white my-1" />
          <span>{ex.targetDenominator}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 text-4xl font-black">
      <FractionDisplay frac={ex.fractionA} />
      <span className="text-slate-400">=</span>
      <span className="text-indigo-400 text-3xl">? y ?/?</span>
    </div>
  )
}

function exerciseLabel(ex: Exercise) {
  if (ex.type === 'compare') return '¿Mayor, menor o igual?  >  <  ='
  if (ex.type === 'simplify') return 'Simplifica la fracción  (ej: 3/4)'
  if (ex.type === 'amplify') return 'Escribe el numerador que falta'
  return 'Convierte a número mixto  (ej: 1 y 3/4)'
}

export default function Game({ config, onGameEnd }: Props) {
  const [scores, setScores] = useState<Scores>({ q: 0, p: 0 })
  const [hp, setHp] = useState<Record<PlayerKey, number>>({ q: MAX_HP, p: MAX_HP })
  const [streak, setStreak] = useState<Record<PlayerKey, number>>({ q: 0, p: 0 })
  const [round, setRound] = useState(1)
  const [exercise, setExercise] = useState<Exercise>(() => generateExercise(1))
  const [phase, setPhase] = useState<Phase>('waiting')
  const [lockedPlayer, setLockedPlayer] = useState<PlayerKey | null>(null)
  const [secondChance, setSecondChance] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timerKey, setTimerKey] = useState(0)

  // Comeback state: when a player hits 0 HP, they get COMEBACK_NEEDED questions
  const [comebackPlayer, setComebackPlayer] = useState<PlayerKey | null>(null)
  const [comebackCount, setComebackCount] = useState(0) // correct answers in comeback

  const inputRef = useRef<HTMLInputElement>(null)
  const other = (p: PlayerKey): PlayerKey => p === 'q' ? 'p' : 'q'

  const startComeback = useCallback((loser: PlayerKey) => {
    setComebackPlayer(loser)
    setComebackCount(0)
    setExercise(generateExercise(Math.ceil(round / 3)))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    setUserInput('')
    setFeedback(null)
    setTimerKey(k => k + 1)
  }, [round])

  const endGame = useCallback((winner: PlayerKey, currentScores: Scores) => {
    onGameEnd(currentScores, config, winner)
  }, [config, onGameEnd])

  const nextRound = useCallback((_newScores: Scores, newHp: Record<PlayerKey, number>) => {
    if (newHp.q <= 0) { startComeback('q'); return }
    if (newHp.p <= 0) { startComeback('p'); return }

    setRound(r => r + 1)
    setExercise(generateExercise(Math.ceil((round + 1) / 3)))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    setUserInput('')
    setFeedback(null)
    setTimerKey(k => k + 1)
  }, [round, startComeback])

  const applyCorrect = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const heal = newStreak[scorer] >= 3 && newStreak[scorer] % 3 === 0 ? HEAL_STREAK : 0
    const newHp = {
      ...currentHp,
      [other(scorer)]: Math.max(0, currentHp[other(scorer)] - DAMAGE),
      [scorer]: Math.min(MAX_HP, currentHp[scorer] + heal),
    }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound])

  const applyComebackCorrect = useCallback((_currentScores: Scores, currentHp: Record<PlayerKey, number>, loser: PlayerKey) => {
    const next = comebackCount + 1
    setFeedback('correct')
    if (next >= COMEBACK_NEEDED) {
      // Comeback success — restore HP and resume normal game
      const newHp = { ...currentHp, [loser]: COMEBACK_HP }
      setHp(newHp)
      setComebackPlayer(null)
      setComebackCount(0)
      setTimeout(() => {
        setRound(r => r + 1)
        setExercise(generateExercise(Math.ceil((round + 1) / 3)))
        setPhase('waiting')
        setLockedPlayer(null)
        setSecondChance(false)
        setUserInput('')
        setFeedback(null)
        setTimerKey(k => k + 1)
      }, 1500)
    } else {
      setComebackCount(next)
      setTimeout(() => {
        setExercise(generateExercise(Math.ceil(round / 3)))
        setPhase('waiting')
        setLockedPlayer(null)
        setSecondChance(false)
        setUserInput('')
        setFeedback(null)
        setTimerKey(k => k + 1)
      }, 1500)
    }
  }, [comebackCount, round])

  const applyComebackFail = useCallback((currentScores: Scores, loser: PlayerKey) => {
    setFeedback('wrong')
    setTimeout(() => endGame(other(loser), currentScores), 1500)
  }, [endGame])

  const applyNoScore = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound])

  const handleSubmit = useCallback(() => {
    if (!lockedPlayer || phase !== 'locked' || feedback) return
    const correct = validateAnswer(exercise, userInput)

    if (comebackPlayer) {
      if (correct) {
        applyComebackCorrect(scores, hp, comebackPlayer)
      } else {
        applyComebackFail(scores, comebackPlayer)
      }
      return
    }

    if (correct) {
      applyCorrect(lockedPlayer, scores, hp, streak)
    } else {
      if (!secondChance) {
        setFeedback('wrong')
        setTimeout(() => {
          setFeedback(null)
          setLockedPlayer(other(lockedPlayer))
          setSecondChance(true)
          setUserInput('')
          setTimerKey(k => k + 1)
          setTimeout(() => inputRef.current?.focus(), 50)
        }, 800)
      } else {
        applyNoScore(scores, hp)
      }
    }
  }, [lockedPlayer, phase, feedback, exercise, userInput, secondChance, scores, hp, streak, comebackPlayer, applyCorrect, applyComebackCorrect, applyComebackFail, applyNoScore])

  const handleTimerExpire = useCallback(() => {
    if (feedback) return
    if (comebackPlayer) {
      applyComebackFail(scores, comebackPlayer)
      return
    }
    if (!secondChance && lockedPlayer) {
      setLockedPlayer(other(lockedPlayer))
      setSecondChance(true)
      setUserInput('')
      setTimerKey(k => k + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      applyNoScore(scores, hp)
    }
  }, [feedback, secondChance, lockedPlayer, scores, hp, comebackPlayer, applyComebackFail, applyNoScore])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'waiting') {
        const key = e.key.toLowerCase() as PlayerKey
        // In comeback mode, only the comeback player can buzz
        if (comebackPlayer && key !== comebackPlayer) return
        if (key === 'q' || key === 'p') {
          setLockedPlayer(key)
          setPhase('locked')
          setTimerKey(k => k + 1)
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
      if (phase === 'locked' && e.key === 'Enter') {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, comebackPlayer, handleSubmit])

  const p1 = config.player1Name
  const p2 = config.player2Name
  const inComeback = comebackPlayer !== null

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Street Fighter header */}
      <div className="flex justify-between items-center px-6 py-4 bg-slate-950 border-b border-slate-800">
        <HealthBar hp={hp.q} maxHp={MAX_HP} side="left" name={p1} streak={streak.q} />
        <div className="flex flex-col items-center gap-1 px-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest">Ronda</div>
          <div className="text-3xl font-black text-yellow-400">{round}</div>
          <div className="flex gap-4 text-lg font-black">
            <span className="text-indigo-400">{scores.q}</span>
            <span className="text-slate-600">vs</span>
            <span className="text-pink-400">{scores.p}</span>
          </div>
        </div>
        <HealthBar hp={hp.p} maxHp={MAX_HP} side="right" name={p2} streak={streak.p} />
      </div>

      {/* Comeback banner */}
      <AnimatePresence>
        {inComeback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/60 border-b border-red-700 px-6 py-2 flex items-center justify-center gap-3"
          >
            <span className="text-red-300 font-black text-sm uppercase tracking-widest">
              🔥 COMEBACK — {comebackPlayer === 'q' ? p1 : p2}
            </span>
            <span className="text-red-400 text-sm">
              {comebackCount}/{COMEBACK_NEEDED} seguidas para sobrevivir
            </span>
            <div className="flex gap-1">
              {Array.from({ length: COMEBACK_NEEDED }, (_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${i < comebackCount ? 'bg-yellow-400 border-yellow-400' : 'border-red-500'}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${round}-${comebackCount}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-slate-500 text-sm">{exerciseLabel(exercise)}</p>
            <div className="bg-slate-800 rounded-3xl px-12 py-8 shadow-xl border border-slate-700">
              {renderExercise(exercise)}
            </div>
            <FractionVisualizer fraction={exercise.fractionA} color="#6366f1" />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`absolute text-9xl pointer-events-none ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            >
              {feedback === 'correct' ? '✓' : '✗'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buzzer row */}
      <div className="flex justify-between items-end px-6 pb-6 bg-slate-950 border-t border-slate-800 pt-4">
        {/* Player 1 side */}
        <div className="flex flex-col items-start gap-3">
          <BuzzerIndicator
            keyLabel="Q"
            playerName={p1}
            active={phase === 'waiting' && (!inComeback || comebackPlayer === 'q')}
            locked={lockedPlayer === 'q'}
            side="left"
          />
          <AnimatePresence>
            {lockedPlayer === 'q' && phase === 'locked' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                <input
                  ref={inputRef}
                  className="bg-slate-700 rounded-xl px-4 py-2 text-white text-xl w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Respuesta"
                  autoComplete="off"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button onClick={handleSubmit} className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-xl font-bold transition-colors">OK</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timer center */}
        {phase === 'locked' && lockedPlayer && (
          <Timer
            key={timerKey}
            seconds={inComeback ? 10 : secondChance ? 5 : 10}
            onExpire={handleTimerExpire}
            running={phase === 'locked' && !feedback}
          />
        )}

        {/* Player 2 side */}
        <div className="flex flex-col items-end gap-3">
          <BuzzerIndicator
            keyLabel="P"
            playerName={p2}
            active={phase === 'waiting' && (!inComeback || comebackPlayer === 'p')}
            locked={lockedPlayer === 'p'}
            side="right"
          />
          <AnimatePresence>
            {lockedPlayer === 'p' && phase === 'locked' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                <input
                  ref={inputRef}
                  className="bg-slate-700 rounded-xl px-4 py-2 text-white text-xl w-36 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Respuesta"
                  autoComplete="off"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button onClick={handleSubmit} className="bg-pink-500 hover:bg-pink-400 px-4 py-2 rounded-xl font-bold transition-colors">OK</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
