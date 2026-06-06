import { useState, useEffect, useCallback } from 'react'
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

type Phase = 'waiting' | 'locked'

const MAX_HP = 100
const DAMAGE = 25
const HEAL_STREAK = 15
const COMEBACK_NEEDED = 3
const COMEBACK_HP = 40

function FractionDisplay({ frac }: { frac: { numerator: number; denominator: number } }) {
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span>{frac.numerator}</span>
      <span className="w-full border-t-2 border-white my-1" />
      <span>{frac.denominator}</span>
    </span>
  )
}

function renderExercise(ex: Exercise, selectedOpt: string | null = null) {
  if (ex.type === 'compare') {
    const symbol = selectedOpt ?? '?'
    const symbolColor = selectedOpt ? 'text-yellow-300' : 'text-slate-400'
    return (
      <div className="flex items-center gap-6 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className={`text-5xl w-12 text-center transition-all ${symbolColor}`}>{symbol}</span>
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
        <div className="inline-flex flex-col items-center leading-none">
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
  if (ex.type === 'compare') return '¿Mayor >, menor < o igual =?'
  if (ex.type === 'simplify') return 'Simplifica la fracción'
  if (ex.type === 'amplify') return '¿Cuál es el numerador que falta?'
  return 'Convierte a número mixto'
}

// Render option label nicely (fractions inline)
function OptionLabel({ text }: { text: string }) {
  // e.g. "3/4" → render as fraction, "1 y 3/4" → "1 y 3/4" with fraction part styled
  if (text === '>' || text === '<' || text === '=') {
    return <span className="text-2xl font-black">{text}</span>
  }
  // mixed: "1 y 3/4"
  const mixedMatch = text.match(/^(\d+)\sy\s(\d+)\/(\d+)$/)
  if (mixedMatch) {
    return (
      <span className="flex items-center gap-1 text-lg font-bold">
        {mixedMatch[1]} y
        <span className="inline-flex flex-col items-center leading-none text-base mx-1">
          <span>{mixedMatch[2]}</span>
          <span className="w-full border-t border-current my-0.5" />
          <span>{mixedMatch[3]}</span>
        </span>
      </span>
    )
  }
  // plain fraction: "3/4"
  const fracMatch = text.match(/^(\d+)\/(\d+)$/)
  if (fracMatch) {
    return (
      <span className="inline-flex flex-col items-center leading-none text-base font-bold">
        <span>{fracMatch[1]}</span>
        <span className="w-full border-t border-current my-0.5" />
        <span>{fracMatch[2]}</span>
      </span>
    )
  }
  // number
  return <span className="text-xl font-bold">{text}</span>
}

interface OptionGridProps {
  options: string[]
  locked: boolean           // this player buzzed in
  onSelect: (opt: string) => void
  selectedOption: string | null
  correctAnswer: string
  revealed: boolean         // show correct/wrong colors after answer
  color: 'indigo' | 'pink'
}

function OptionGrid({ options, locked, onSelect, selectedOption, correctAnswer, revealed, color }: OptionGridProps) {
  const accent = color === 'indigo' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' : 'border-pink-500 bg-pink-500/20 text-pink-200'
  const base = locked
    ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:border-slate-400 cursor-pointer'
    : 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-default'

  return (
    <div className={`grid gap-2 grid-cols-3 w-full max-w-xs ${!locked ? 'opacity-50' : ''}`}>
      {options.map((opt, i) => {
        let cls = base
        if (locked) {
          if (revealed) {
            if (opt === correctAnswer) cls = 'border-green-500 bg-green-500/20 text-green-200 cursor-default'
            else if (opt === selectedOption) cls = 'border-red-500 bg-red-500/20 text-red-200 cursor-default'
            else cls = 'border-slate-700 bg-slate-900 text-slate-500 cursor-default'
          } else if (opt === selectedOption) {
            cls = accent
          }
        }
        return (
          <motion.button
            key={opt}
            whileTap={locked && !revealed ? { scale: 0.95 } : {}}
            onClick={() => locked && !revealed && onSelect(opt)}
            className={`border-2 rounded-xl px-3 py-3 flex items-center justify-center min-h-[56px] transition-colors ${cls}`}
            title={locked ? `Opción ${i + 1}` : ''}
          >
            <OptionLabel text={opt} />
          </motion.button>
        )
      })}
    </div>
  )
}

function buildHint(ex: Exercise): string {
  if (ex.type === 'compare') {
    const a = ex.fractionA
    const b = ex.fractionB!
    const da = (a.numerator / a.denominator).toFixed(2)
    const db = (b.numerator / b.denominator).toFixed(2)
    return `Pista: convierte a decimal → ${a.numerator}/${a.denominator} = ${da}  y  ${b.numerator}/${b.denominator} = ${db}`
  }
  if (ex.type === 'simplify') {
    const { numerator: n, denominator: d } = ex.fractionA
    return `Pista: busca el MCD de ${n} y ${d}, luego divide ambos por él`
  }
  if (ex.type === 'amplify') {
    const { numerator: n, denominator: d } = ex.fractionA
    const factor = ex.targetDenominator! / d
    return `Pista: ${d} × ${factor} = ${ex.targetDenominator}, así que el numerador es ${n} × ${factor}`
  }
  // mixed
  const { numerator: n, denominator: d } = ex.fractionA
  const whole = Math.floor(n / d)
  const rem = n % d
  return `Pista: ${n} ÷ ${d} = ${whole} (resto ${rem}), entonces es ${whole} y ${rem}/${d}`
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [comebackPlayer, setComebackPlayer] = useState<PlayerKey | null>(null)
  const [comebackCount, setComebackCount] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const other = (p: PlayerKey): PlayerKey => p === 'q' ? 'p' : 'q'

  const newExercise = (r: number) => generateExercise(Math.ceil(r / 3))

  const resetRound = useCallback((r: number) => {
    setExercise(newExercise(r))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    setSelectedOption(null)
    setFeedback(null)
    setShowHint(false)
    setTimerKey(k => k + 1)
  }, [])

  const startComeback = useCallback((loser: PlayerKey) => {
    setComebackPlayer(loser)
    setComebackCount(0)
    resetRound(round)
  }, [round, resetRound])

  const endGame = useCallback((winner: PlayerKey, currentScores: Scores) => {
    onGameEnd(currentScores, config, winner)
  }, [config, onGameEnd])

  const nextRound = useCallback((_newScores: Scores, newHp: Record<PlayerKey, number>) => {
    if (newHp.q <= 0) { startComeback('q'); return }
    if (newHp.p <= 0) { startComeback('p'); return }
    const next = round + 1
    setRound(next)
    resetRound(next)
  }, [round, startComeback, resetRound])

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

  const applyComebackCorrect = useCallback((currentHp: Record<PlayerKey, number>, loser: PlayerKey) => {
    const next = comebackCount + 1
    setFeedback('correct')
    if (next >= COMEBACK_NEEDED) {
      const newHp = { ...currentHp, [loser]: COMEBACK_HP }
      setHp(newHp)
      setComebackPlayer(null)
      setComebackCount(0)
      const next2 = round + 1
      setRound(next2)
      setTimeout(() => resetRound(next2), 1500)
    } else {
      setComebackCount(next)
      setTimeout(() => resetRound(round), 1500)
    }
  }, [comebackCount, round, resetRound])

  const applyComebackFail = useCallback((currentScores: Scores, loser: PlayerKey) => {
    setFeedback('wrong')
    setTimeout(() => endGame(other(loser), currentScores), 1500)
  }, [endGame])

  const applyNoScore = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound])

  // Second player got it right — point to them, NO damage to first player
  const applyCorrectNoDamage = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    setScores(newScores)
    setStreak(newStreak)
    setFeedback('correct')
    setTimeout(() => nextRound(newScores, currentHp), 1500)
  }, [nextRound])

  // Second player also failed — they take half damage
  const applySecondChanceFail = useCallback((failedPlayer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    const newHp = { ...currentHp, [failedPlayer]: Math.max(0, currentHp[failedPlayer] - Math.floor(DAMAGE / 2)) }
    setHp(newHp)
    setFeedback('wrong')
    setTimeout(() => nextRound(currentScores, newHp), 1500)
  }, [nextRound])

  const handleSelect = useCallback((opt: string) => {
    if (!lockedPlayer || phase !== 'locked' || feedback || selectedOption) return
    setSelectedOption(opt)
    const correct = validateAnswer(exercise, opt)

    if (comebackPlayer) {
      if (correct) applyComebackCorrect(hp, comebackPlayer)
      else applyComebackFail(scores, comebackPlayer)
      return
    }

    if (correct) {
      if (secondChance) {
        // Second player answered correctly — score point but NO HP damage to first player
        applyCorrectNoDamage(lockedPlayer, scores, hp, streak)
      } else {
        applyCorrect(lockedPlayer, scores, hp, streak)
      }
    } else {
      if (!secondChance) {
        setFeedback('wrong')
        setTimeout(() => {
          setFeedback(null)
          setSelectedOption(null)
          setLockedPlayer(other(lockedPlayer))
          setSecondChance(true)
          setTimerKey(k => k + 1)
        }, 900)
      } else {
        // Second player also failed — they lose HP
        applySecondChanceFail(lockedPlayer, scores, hp)
      }
    }
  }, [lockedPlayer, phase, feedback, selectedOption, exercise, secondChance, scores, hp, streak, comebackPlayer, applyCorrect, applyCorrectNoDamage, applySecondChanceFail, applyComebackCorrect, applyComebackFail, applyNoScore])

  const handleTimerExpire = useCallback(() => {
    if (feedback || selectedOption) return
    if (comebackPlayer) {
      applyComebackFail(scores, comebackPlayer)
      return
    }
    if (!secondChance && lockedPlayer) {
      setFeedback(null)
      setSelectedOption(null)
      setLockedPlayer(other(lockedPlayer))
      setSecondChance(true)
      setTimerKey(k => k + 1)
    } else {
      applyNoScore(scores, hp)
    }
  }, [feedback, selectedOption, secondChance, lockedPlayer, scores, hp, comebackPlayer, applyComebackFail, applyNoScore])

  // Keyboard: Q/P to buzz, number keys 1-6 to pick option
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'waiting') {
        const key = e.key.toLowerCase() as PlayerKey
        if (comebackPlayer && key !== comebackPlayer) return
        if (key === 'q' || key === 'p') {
          setLockedPlayer(key)
          setPhase('locked')
          setTimerKey(k => k + 1)
        }
      }
      if (phase === 'locked' && lockedPlayer && !feedback && !selectedOption) {
        const num = parseInt(e.key)
        if (!isNaN(num) && num >= 1 && num <= exercise.options.length) {
          handleSelect(exercise.options[num - 1])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, comebackPlayer, lockedPlayer, feedback, selectedOption, exercise, handleSelect])

  // Show hint after 8s when a player is locked and hasn't answered
  useEffect(() => {
    if (phase !== 'locked' || feedback || selectedOption) return
    setShowHint(false)
    const id = setTimeout(() => setShowHint(true), 8000)
    return () => clearTimeout(id)
  }, [phase, timerKey, feedback, selectedOption])

  const p1 = config.player1Name
  const p2 = config.player2Name
  const inComeback = comebackPlayer !== null
  const revealed = feedback !== null

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Health bar header */}
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
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < comebackCount ? 'bg-yellow-400 border-yellow-400' : 'border-red-500'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${round}-${comebackCount}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4 w-full max-w-2xl"
          >
            <p className="text-slate-500 text-sm">{exerciseLabel(exercise)}</p>
            <div className="bg-slate-800 rounded-3xl px-12 py-8 shadow-xl border border-slate-700">
              {renderExercise(exercise, exercise.type === 'compare' ? selectedOption : null)}
            </div>
            <FractionVisualizer fraction={exercise.fractionA} color="#6366f1" />

            {/* Options — always visible, interactive only when locked */}
            <div className="flex flex-col items-center gap-2 w-full">
              <OptionGrid
                options={exercise.options}
                locked={phase === 'locked' && !!lockedPlayer}
                onSelect={handleSelect}
                selectedOption={selectedOption}
                correctAnswer={String(exercise.answer)}
                revealed={revealed}
                color={lockedPlayer === 'q' ? 'indigo' : 'pink'}
              />
              {phase === 'locked' && !feedback && (
                <p className="text-slate-600 text-xs">Teclas 1–{exercise.options.length} para seleccionar</p>
              )}
              {phase === 'waiting' && (
                <p className="text-slate-600 text-xs">Presiona Q o P para responder</p>
              )}
              <AnimatePresence>
                {showHint && !feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1 px-4 py-2 bg-yellow-900/40 border border-yellow-600/40 rounded-xl text-yellow-300 text-sm text-center max-w-sm"
                  >
                    💡 {buildHint(exercise)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Feedback overlay */}
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
      <div className="flex justify-between items-center px-6 pb-6 bg-slate-950 border-t border-slate-800 pt-4 gap-4">
        {/* Player 1 */}
        <div className="flex flex-col items-start gap-3 flex-1">
          <BuzzerIndicator
            keyLabel="Q"
            playerName={p1}
            active={phase === 'waiting' && (!inComeback || comebackPlayer === 'q')}
            locked={lockedPlayer === 'q'}
            side="left"
          />
        </div>

        {/* Timer center */}
        <div className="flex-shrink-0">
          {phase === 'locked' && lockedPlayer && (
            <Timer
              key={timerKey}
              seconds={inComeback ? 10 : secondChance ? 5 : 10}
              onExpire={handleTimerExpire}
              running={phase === 'locked' && !feedback}
            />
          )}
        </div>

        {/* Player 2 */}
        <div className="flex flex-col items-end gap-3 flex-1">
          <BuzzerIndicator
            keyLabel="P"
            playerName={p2}
            active={phase === 'waiting' && (!inComeback || comebackPlayer === 'p')}
            locked={lockedPlayer === 'p'}
            side="right"
          />
        </div>
      </div>
    </div>
  )
}
