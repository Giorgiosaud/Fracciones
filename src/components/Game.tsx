import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { Exercise, GameConfig, PlayerKey, Scores } from '../lib/types'
import { generateExercise, validateAnswer } from '../lib/exercises'
import { getRandomJoke } from '../lib/jokes'
import FractionVisualizer from './FractionVisualizer'
import Timer from './Timer'
import HealthBar from './HealthBar'
import { useSoundFX } from '../hooks/useSoundFX'
import { useBGM } from '../hooks/useBGM'
import ScreenFlash from './effects/ScreenFlash'
import FloatingDamage from './effects/FloatingDamage'
import ComebackEntrance from './effects/ComebackEntrance'

interface Props {
  config: GameConfig
  onGameEnd: (scores: Scores, config: GameConfig, winner: PlayerKey) => void
}

type Phase = 'waiting' | 'locked'

const MAX_HP = 100
const DAMAGE = 25
const COMEBACK_NEEDED = 3
const COMEBACK_HP = 40

function calcDamage(baseStreak: number, isSecondChance: boolean) {
  if (isSecondChance) return Math.floor(DAMAGE / 2)
  const multiplier = baseStreak >= 3 ? 1 + (baseStreak - 2) * 0.1 : 1
  return Math.round(DAMAGE * multiplier)
}

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
    const symbolColor = selectedOpt ? 'text-[#FFD700]' : 'text-white/40'
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
        <span className="text-white/40">=</span>
        <span className="text-[#FFD700] text-5xl">?</span>
      </div>
    )
  }
  if (ex.type === 'amplify') {
    return (
      <div className="flex items-center gap-4 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-white/40">=</span>
        <div className="inline-flex flex-col items-center leading-none">
          <span className="text-[#FFD700]">?</span>
          <span className="w-full border-t-2 border-white my-1" />
          <span>{ex.targetDenominator}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 text-4xl font-black">
      <FractionDisplay frac={ex.fractionA} />
      <span className="text-white/40">=</span>
      <span className="text-[#FFD700] text-3xl">? y ?/?</span>
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
  locked: boolean
  onSelect: (opt: string) => void
  wrongSelections: string[]
  correctAnswer: string
  revealCorrect: boolean
  color: 'blue' | 'red'
}

function OptionGrid({ options, locked, onSelect, wrongSelections, correctAnswer, revealCorrect, color }: OptionGridProps) {
  const accentColor = color === 'blue' ? '#1D9BF0' : '#FF3B3B'
  const canClick = locked && !revealCorrect

  return (
    <div className={`grid gap-2 grid-cols-3 w-full max-w-sm transition-opacity ${!locked ? 'opacity-40' : ''}`}>
      {options.map((opt, i) => {
        const isWrong = wrongSelections.includes(opt)
        const isCorrect = revealCorrect && opt === correctAnswer

        let style: React.CSSProperties
        let extraCls = ''

        if (isCorrect) {
          style = { border: '3px solid #00E676', background: 'rgba(0,230,118,0.15)', color: '#00E676', boxShadow: '0 0 12px #00E676, 3px 3px 0 #000' }
        } else if (isWrong) {
          style = { border: '3px solid rgba(255,59,59,0.5)', background: 'rgba(255,59,59,0.08)', color: 'rgba(255,59,59,0.5)', boxShadow: '3px 3px 0 #000' }
          extraCls = 'line-through'
        } else if (canClick) {
          style = { border: `3px solid ${accentColor}`, background: '#16162A', color: 'white', boxShadow: '3px 3px 0 #000', cursor: 'pointer' }
        } else {
          style = { border: '3px solid #2a2a4a', background: '#16162A', color: '#444', boxShadow: '3px 3px 0 #000' }
        }

        return (
          <motion.button
            key={opt}
            whileTap={canClick && !isWrong ? { scale: 0.93, x: 2, y: 2 } : {}}
            onClick={() => canClick && !isWrong && onSelect(opt)}
            style={style}
            className={`rounded-xl px-3 py-3 flex items-center justify-center min-h-[56px] transition-colors font-display ${extraCls}`}
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null)  // current player's pick (for compare display)
  const [wrongSelections, setWrongSelections] = useState<string[]>([])        // all wrong picks so far
  const [revealCorrect, setRevealCorrect] = useState(false)                   // show green after both responded
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [comebackPlayer, setComebackPlayer] = useState<PlayerKey | null>(null)
  const [comebackCount, setComebackCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [joke, setJoke] = useState<{ setup: string; punchline: string } | null>(null)
  const jokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jokeRoundRef = useRef<number>(0)

  const sfx = useSoundFX()
  const bgm = useBGM()

  const [flash, setFlash] = useState<{ color: string; trigger: number }>({ color: '#ffffff', trigger: 0 })
  const fireFlash = useCallback((color: string) => setFlash(f => ({ color, trigger: f.trigger + 1 })), [])

  const [dmgQ, setDmgQ] = useState<{ value: string; trigger: number }>({ value: '', trigger: 0 })
  const [dmgP, setDmgP] = useState<{ value: string; trigger: number }>({ value: '', trigger: 0 })
  const fireDamage = useCallback((side: 'q' | 'p', value: string) => {
    if (side === 'q') setDmgQ(d => ({ value, trigger: d.trigger + 1 }))
    else setDmgP(d => ({ value, trigger: d.trigger + 1 }))
  }, [])

  const [shakingQ, setShakingQ] = useState(false)
  const [shakingP, setShakingP] = useState(false)
  const shakePlayer = useCallback((player: PlayerKey) => {
    if (player === 'q') { setShakingQ(true); setTimeout(() => setShakingQ(false), 450) }
    else { setShakingP(true); setTimeout(() => setShakingP(false), 450) }
  }, [])

  const [showComebackEntrance, setShowComebackEntrance] = useState(false)

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#FFD700', '#00E676', '#1D9BF0', '#FF3B3B', '#ffffff'] })
  }, [])

  const other = (p: PlayerKey): PlayerKey => p === 'q' ? 'p' : 'q'

  const newExercise = (r: number) => generateExercise(Math.ceil(r / 3))

  const clearRoundState = () => {
    setSelectedOption(null)
    setWrongSelections([])
    setRevealCorrect(false)
    setFeedback(null)
    setShowHint(false)
    setTimerKey(k => k + 1)
  }

  const showJokeThenReset = useCallback((r: number) => {
    if (r % 3 === 0) {
      jokeRoundRef.current = r
      setJoke(getRandomJoke())
      jokeTimer.current = setTimeout(() => {
        setJoke(null)
        setExercise(newExercise(r))
        setPhase('waiting')
        setLockedPlayer(null)
        setSecondChance(false)
        clearRoundState()
      }, 15000)
    } else {
      setExercise(newExercise(r))
      setPhase('waiting')
      setLockedPlayer(null)
      setSecondChance(false)
      clearRoundState()
    }
  }, [])

  const resetRound = useCallback((r: number) => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current)
    setJoke(null)
    setExercise(newExercise(r))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    clearRoundState()
  }, [])

  const startComeback = useCallback((loser: PlayerKey) => {
    setComebackPlayer(loser)
    setComebackCount(0)
    sfx.playComebackActivate()
    bgm.setDanger(true)
    setShowComebackEntrance(true)
    setTimeout(() => setShowComebackEntrance(false), 2500)
    resetRound(round)
  }, [round, resetRound, sfx, bgm])

  const endGame = useCallback((winner: PlayerKey, currentScores: Scores) => {
    onGameEnd(currentScores, config, winner)
  }, [config, onGameEnd])

  const nextRound = useCallback((_newScores: Scores, newHp: Record<PlayerKey, number>) => {
    if (newHp.q <= 0) { startComeback('q'); return }
    if (newHp.p <= 0) { startComeback('p'); return }
    const next = round + 1
    setRound(next)
    showJokeThenReset(next)
  }, [round, startComeback, showJokeThenReset])

  const applyCorrect = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(newStreak[scorer], false)
    const newHp = {
      ...currentHp,
      [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg),
    }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    sfx.playCorrect()
    if (newStreak[scorer] >= 3) sfx.playStreakHit(newStreak[scorer])
    bgm.setStreak(newStreak[scorer])
    fireFlash('#00E676')
    fireConfetti()
    const multiplierLabel = newStreak[scorer] >= 3 ? `×${(1 + (newStreak[scorer] - 2) * 0.1).toFixed(1)} ` : ''
    fireDamage(other(scorer), `-${multiplierLabel}${dmg}`)
    shakePlayer(other(scorer))
    sfx.playDamage()
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound, sfx, bgm, fireFlash, fireConfetti, fireDamage, shakePlayer])

  const applyComebackCorrect = useCallback((currentHp: Record<PlayerKey, number>, loser: PlayerKey) => {
    const next = comebackCount + 1
    setFeedback('correct')
    if (next >= COMEBACK_NEEDED) {
      const newHp = { ...currentHp, [loser]: COMEBACK_HP }
      setHp(newHp)
      setComebackPlayer(null)
      setComebackCount(0)
      sfx.playComebackSuccess()
      bgm.setDanger(false)
      bgm.setStreak(0)
      fireFlash('#FFD700')
      fireConfetti()
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#FFD700', '#FF6B00', '#ffffff'] })
      const next2 = round + 1
      setRound(next2)
      setTimeout(() => resetRound(next2), 1500)
    } else {
      setComebackCount(next)
      sfx.playComebackTick(next)
      fireFlash('rgba(255,59,59,0.4)')
      setTimeout(() => resetRound(round), 1500)
    }
  }, [comebackCount, round, resetRound, sfx, bgm, fireFlash, fireConfetti])

  const applyComebackFail = useCallback((currentScores: Scores, loser: PlayerKey) => {
    setFeedback('wrong')
    sfx.playComebackFail()
    fireFlash('rgba(0,0,0,0.7)')
    setTimeout(() => endGame(other(loser), currentScores), 1500)
  }, [endGame, sfx, fireFlash])

  const applyNoScore = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    sfx.playWrong()
    fireFlash('rgba(255,59,59,0.35)')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound, sfx, fireFlash])

  // Second player got it right — half damage, no streak multiplier
  const applyCorrectNoDamage = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(0, true)
    const newHp = { ...currentHp, [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg) }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    sfx.playCorrect()
    fireFlash('#00E676')
    fireConfetti()
    fireDamage(other(scorer), `½ -${dmg}`)
    shakePlayer(other(scorer))
    sfx.playDamage()
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound, sfx, fireFlash, fireConfetti, fireDamage, shakePlayer])

  // Both players failed — no penalty, just next round
  const applySecondChanceFail = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    sfx.playWrong()
    fireFlash('rgba(255,59,59,0.35)')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound, sfx, fireFlash])

  const handleSelect = useCallback((opt: string) => {
    if (!lockedPlayer || phase !== 'locked' || feedback || selectedOption) return
    setSelectedOption(opt)
    const correct = validateAnswer(exercise, opt)

    if (comebackPlayer) {
      if (correct) {
        setRevealCorrect(true)
        setFeedback('correct')
        setTimeout(() => applyComebackCorrect(hp, comebackPlayer), 1500)
      } else {
        setWrongSelections(w => [...w, opt])
        setRevealCorrect(true)
        setFeedback('wrong')
        setTimeout(() => applyComebackFail(scores, comebackPlayer), 1500)
      }
      return
    }

    if (correct) {
      setRevealCorrect(true)
      if (secondChance) {
        applyCorrectNoDamage(lockedPlayer, scores, hp, streak)
      } else {
        applyCorrect(lockedPlayer, scores, hp, streak)
      }
    } else {
      setWrongSelections(w => [...w, opt])
      if (!secondChance) {
        // First player wrong — pass to second, don't reveal correct yet
        setTimeout(() => {
          setSelectedOption(null)
          setLockedPlayer(other(lockedPlayer))
          setSecondChance(true)
          setTimerKey(k => k + 1)
        }, 900)
      } else {
        // Both answered wrong — now reveal correct
        setRevealCorrect(true)
        applySecondChanceFail(scores, hp)
      }
    }
  }, [lockedPlayer, phase, feedback, selectedOption, exercise, secondChance, scores, hp, streak, comebackPlayer, applyCorrect, applyCorrectNoDamage, applySecondChanceFail, applyComebackCorrect, applyComebackFail])

  const handleTimerExpire = useCallback(() => {
    if (feedback || selectedOption) return
    if (comebackPlayer) {
      setRevealCorrect(true)
      applyComebackFail(scores, comebackPlayer)
      return
    }
    if (!secondChance && lockedPlayer) {
      setSelectedOption(null)
      setLockedPlayer(other(lockedPlayer))
      setSecondChance(true)
      setTimerKey(k => k + 1)
    } else {
      // Both timed out — reveal correct and no score
      setRevealCorrect(true)
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
          setStreak(s => ({ ...s, [key === 'q' ? 'p' : 'q']: 0 }))
          sfx.playBuzzer(key)
          fireFlash(key === 'q' ? 'rgba(29,155,240,0.5)' : 'rgba(255,59,59,0.5)')
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
  }, [phase, comebackPlayer, lockedPlayer, feedback, selectedOption, exercise, handleSelect, sfx, fireFlash])

  // Auto-start BGM on first interaction (buzzer press starts it via the keyboard handler above)
  // We start it lazily on first keydown so AudioContext is allowed by browser
  useEffect(() => {
    const onFirst = () => { bgm.start(); window.removeEventListener('keydown', onFirst) }
    window.addEventListener('keydown', onFirst)
    return () => { window.removeEventListener('keydown', onFirst); bgm.stop() }
  }, [bgm])

  // Show hint after 8s when a player is locked and hasn't answered
  useEffect(() => {
    if (phase !== 'locked' || feedback || selectedOption) return
    setShowHint(false)
    const id = setTimeout(() => setShowHint(true), 8000)
    return () => clearTimeout(id)
  }, [phase, timerKey, feedback, selectedOption])

  const closeJoke = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current)
    const r = jokeRoundRef.current
    setJoke(null)
    setExercise(newExercise(r))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    clearRoundState()
  }, [])

  const p1 = config.player1Name
  const p2 = config.player2Name
  const inComeback = comebackPlayer !== null

  const keyBadge = (key: 'Q' | 'P') => {
    const pk: PlayerKey = key.toLowerCase() as PlayerKey
    const color = key === 'Q' ? '#1D9BF0' : '#FF3B3B'
    const isLocked = lockedPlayer === pk
    const isActive = phase === 'waiting' && (!inComeback || comebackPlayer === pk)
    return (
      <motion.div
        animate={isActive && !isLocked ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ repeat: isActive && !isLocked ? Infinity : 0, duration: 1, ease: 'easeInOut' }}
        style={{
          background: isLocked ? color : 'transparent',
          border: `3px solid ${color}`,
          boxShadow: isLocked ? `0 0 14px ${color}, 3px 3px 0 #000` : '3px 3px 0 #000',
          color: isLocked ? '#FFD700' : color,
          opacity: inComeback && comebackPlayer !== pk ? 0.3 : 1,
        }}
        className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-xl select-none flex-shrink-0"
      >
        {key}
      </motion.div>
    )
  }

  return (
    <div className="h-screen overflow-hidden text-white flex flex-col" style={{ background: 'var(--bg)' }}>
      <ScreenFlash color={flash.color} trigger={flash.trigger} />
      <FloatingDamage value={dmgQ.value} side="left" trigger={dmgQ.trigger} />
      <FloatingDamage value={dmgP.value} side="right" trigger={dmgP.trigger} />
      <ComebackEntrance
        playerName={comebackPlayer === 'q' ? p1 : p2}
        visible={showComebackEntrance}
      />
      {/* Header: key badge | health bar | round | health bar | key badge */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0" style={{ background: '#0a0a15' }}>
        {keyBadge('Q')}
        <HealthBar hp={hp.q} maxHp={MAX_HP} side="left" name={p1} streak={streak.q} shaking={shakingQ} />
        <div className="flex flex-col items-center gap-0.5 px-3 flex-shrink-0">
          <div className="font-display text-[10px] text-white/30 tracking-widest">RONDA</div>
          <div className="font-display text-3xl text-[#FFD700] drop-shadow-[2px_2px_0_#000] leading-none">{round}</div>
          <div className="flex gap-2 font-display text-base leading-none mt-0.5">
            <span style={{ color: '#1D9BF0', textShadow: '0 0 6px #1D9BF0' }}>{scores.q}</span>
            <span className="text-white/20">-</span>
            <span style={{ color: '#FF3B3B', textShadow: '0 0 6px #FF3B3B' }}>{scores.p}</span>
          </div>
        </div>
        <HealthBar hp={hp.p} maxHp={MAX_HP} side="right" name={p2} streak={streak.p} shaking={shakingP} />
        {keyBadge('P')}
        {/* BGM controls */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 ml-1">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={bgm.toggleMute}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: '#1a1a2e', border: '2px solid #333', boxShadow: '2px 2px 0 #000' }}
            title={bgm.muted ? 'Activar música' : 'Silenciar música'}
          >
            {bgm.muted ? '🔇' : '🔊'}
          </motion.button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={bgm.volume}
            onChange={e => bgm.setVolume(parseFloat(e.target.value))}
            className="w-8 accent-[#FFD700]"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '40px', cursor: 'pointer' }}
            title="Volumen"
          />
        </div>
      </div>

      {/* Comeback banner */}
      <AnimatePresence>
        {inComeback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(255,59,59,0.15)', borderBottom: '2px solid rgba(255,59,59,0.4)' }}
            className="flex-shrink-0 px-6 py-1.5 flex items-center justify-center gap-3"
          >
            <span className="font-display text-[#FF3B3B] text-xs tracking-widest">🔥 COMEBACK — {comebackPlayer === 'q' ? p1 : p2}</span>
            <div className="flex gap-1">
              {Array.from({ length: COMEBACK_NEEDED }, (_, i) => (
                <div key={i} className="w-3 h-3 rounded-full" style={{
                  background: i < comebackCount ? '#FFD700' : 'transparent',
                  border: `2px solid ${i < comebackCount ? '#FFD700' : '#FF3B3B'}`,
                  boxShadow: i < comebackCount ? '0 0 6px #FFD700' : 'none',
                }} />
              ))}
            </div>
            <span className="text-white/40 text-xs">{comebackCount}/{COMEBACK_NEEDED} para sobrevivir</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${round}-${comebackCount}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-3 w-full max-w-2xl"
          >
            <p className="font-display text-white/40 text-xs tracking-widest">{exerciseLabel(exercise)}</p>
            <div
              className="rounded-3xl px-10 py-6"
              style={{ background: 'var(--surface)', border: '3px solid #000', boxShadow: '6px 6px 0 #000' }}
            >
              {renderExercise(exercise, exercise.type === 'compare' ? selectedOption : null)}
            </div>
            <FractionVisualizer fraction={exercise.fractionA} color="#FFD700" />

            {/* Options */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <OptionGrid
                options={exercise.options}
                locked={phase === 'locked' && !!lockedPlayer}
                onSelect={handleSelect}
                wrongSelections={wrongSelections}
                correctAnswer={String(exercise.answer)}
                revealCorrect={revealCorrect}
                color={lockedPlayer === 'q' ? 'blue' : 'red'}
              />
              {/* Timer bar below options when locked */}
              {phase === 'locked' && lockedPlayer && (
                <div className="mt-1">
                  <Timer
                    key={timerKey}
                    seconds={inComeback ? config.timerSeconds : secondChance ? Math.ceil(config.timerSeconds / 2) : config.timerSeconds}
                    onExpire={handleTimerExpire}
                    running={phase === 'locked' && !feedback}
                  />
                </div>
              )}
              {phase === 'waiting' && (
                <p className="font-display text-white/20 text-xs tracking-widest">PRESIONA Q O P PARA RESPONDER</p>
              )}
              <AnimatePresence>
                {showHint && !feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ background: 'rgba(255,215,0,0.1)', border: '2px solid rgba(255,215,0,0.4)', boxShadow: '3px 3px 0 #000' }}
                    className="px-4 py-2 rounded-xl text-[#FFD700] text-sm text-center max-w-sm"
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
              style={{ color: feedback === 'correct' ? '#00E676' : '#FF3B3B', textShadow: `0 0 40px ${feedback === 'correct' ? '#00E676' : '#FF3B3B'}` }}
              className="absolute font-display text-9xl pointer-events-none drop-shadow-[4px_4px_0_#000]"
            >
              {feedback === 'correct' ? '✓' : '✗'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Joke overlay */}
        <AnimatePresence>
          {joke && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: 'rgba(13,13,26,0.96)' }}
            >
              <div className="text-center max-w-sm px-8 py-8 rounded-3xl card-3d" style={{ background: 'var(--surface)' }}>
                <div className="text-4xl mb-4">😄</div>
                <p className="text-white text-lg font-semibold mb-4">{joke.setup}</p>
                <p className="font-display text-[#FFD700] text-2xl drop-shadow-[2px_2px_0_#000]">{joke.punchline}</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={closeJoke}
                  className="mt-6 btn-3d font-display text-black text-lg px-8 py-2 rounded-xl tracking-widest"
                  style={{ background: '#FFD700' }}
                >
                  ¡SIGUIENTE!
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
