import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import type { Exercise, GameConfig } from '../lib/types'
import { generateExercise, validateAnswer } from '../lib/exercises'
import { getRandomJoke } from '../lib/jokes'
import { loadSoloHighScore, saveSoloHighScore } from '../lib/soloStorage'
import { submitScore } from '../lib/leaderboardApi'
import FractionVisualizer from './FractionVisualizer'
import Leaderboard from './Leaderboard'
import Timer from './Timer'
import { useSoundFX } from '../hooks/useSoundFX'
import { useBGM } from '../hooks/useBGM'
import ScreenFlash from './effects/ScreenFlash'
import { renderExercise, exerciseLabel, OptionGrid, buildHint } from './exercise/ExerciseDisplay'

interface Props {
  config: GameConfig
  onExit: () => void
}

type Phase = 'answering' | 'feedback'

const newExercise = (r: number) => generateExercise(Math.ceil(r / 3))

const BASE_POINTS = 10

// Same streak-reward curve as VS mode's damage multiplier (Game.tsx calcDamage)
// — a streak of 3+ scores progressively more points per correct answer.
function calcPoints(streakAfterAnswer: number) {
  const multiplier = streakAfterAnswer >= 3 ? 1 + (streakAfterAnswer - 2) * 0.1 : 1
  return Math.round(BASE_POINTS * multiplier)
}

export default function SoloGame({ config, onExit }: Props) {
  const [round, setRound] = useState(1)
  const [exercise, setExercise] = useState<Exercise>(() => generateExercise(1))
  const [phase, setPhase] = useState<Phase>('answering')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [revealCorrect, setRevealCorrect] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const [points, setPoints] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [record, setRecord] = useState(() => loadSoloHighScore())
  const [showSummary, setShowSummary] = useState(false)

  const [joke, setJoke] = useState<{ setup: string; punchline: string } | null>(null)
  const jokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jokeRoundRef = useRef<number>(0)
  const autoSummaryShownRef = useRef(false)

  const sfx = useSoundFX()
  const bgm = useBGM()

  const [flash, setFlash] = useState<{ color: string; trigger: number }>({ color: '#ffffff', trigger: 0 })
  const fireFlash = useCallback((color: string) => setFlash(f => ({ color, trigger: f.trigger + 1 })), [])

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#FFD700', '#00E676', '#1D9BF0', '#FF3B3B', '#ffffff'] })
  }, [])

  const clearRoundState = () => {
    setSelectedOption(null)
    setRevealCorrect(false)
    setFeedback(null)
    setShowHint(false)
    setTimerKey(k => k + 1)
  }

  const advanceRound = useCallback((r: number) => {
    setExercise(newExercise(r))
    setPhase('answering')
    clearRoundState()
  }, [])

  const showJokeThenAdvance = useCallback((r: number) => {
    if (r % 3 === 0) {
      jokeRoundRef.current = r
      setJoke(getRandomJoke())
      jokeTimer.current = setTimeout(() => {
        setJoke(null)
        advanceRound(r)
      }, 15000)
    } else {
      advanceRound(r)
    }
  }, [advanceRound])

  const nextRound = useCallback(() => {
    const next = round + 1
    setRound(next)
    showJokeThenAdvance(next)
  }, [round, showJokeThenAdvance])

  const handleResult = useCallback((correct: boolean) => {
    setTotalCount(t => t + 1)
    if (correct) {
      const nextStreak = streak + 1
      setCorrectCount(c => c + 1)
      setStreak(nextStreak)
      setPoints(p => p + calcPoints(nextStreak))
      setFeedback('correct')
      sfx.playCorrect()
      if (nextStreak >= 3) sfx.playStreakHit(nextStreak)
      bgm.setStreak(nextStreak)
      fireFlash('#00E676')
      fireConfetti()
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak)
        if (nextStreak > record.bestStreak) {
          setNewRecord(true)
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#FFD700', '#FF6B00', '#ffffff'] })
        }
      }
    } else {
      setStreak(0)
      bgm.setStreak(0)
      setFeedback('wrong')
      sfx.playWrong()
      fireFlash('rgba(255,59,59,0.35)')
    }
    setRevealCorrect(true)
  }, [streak, bestStreak, record, sfx, bgm, fireFlash, fireConfetti])

  const handleSelect = useCallback((opt: string) => {
    if (phase !== 'answering' || feedback || selectedOption) return
    setSelectedOption(opt)
    handleResult(validateAnswer(exercise, opt))
  }, [phase, feedback, selectedOption, exercise, handleResult])

  const handleTimerExpire = useCallback(() => {
    if (feedback || selectedOption) return
    handleResult(false)
  }, [feedback, selectedOption, handleResult])

  // Number keys 1-6 to pick an option
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'answering' || feedback || selectedOption) return
      const num = parseInt(e.key)
      if (!isNaN(num) && num >= 1 && num <= exercise.options.length) {
        handleSelect(exercise.options[num - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, feedback, selectedOption, exercise, handleSelect])

  // Start BGM immediately — no buzz-in step in solo mode.
  // Depend on the stable start/stop refs (not the bgm object, which is a new
  // reference on every render) so the loop runs once and isn't restarted on
  // top of itself each time an answer updates state — that caused overlap.
  useEffect(() => {
    bgm.start()
    return () => { bgm.stop() }
  }, [bgm.start, bgm.stop])

  // Show hint after 8s without an answer
  useEffect(() => {
    if (phase !== 'answering' || feedback || selectedOption) return
    setShowHint(false)
    const id = setTimeout(() => setShowHint(true), 8000)
    return () => clearTimeout(id)
  }, [phase, timerKey, feedback, selectedOption])

  const closeJoke = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current)
    setJoke(null)
    advanceRound(jokeRoundRef.current)
  }, [advanceRound])

  useEffect(() => {
    if (totalCount >= config.questionLimit && !autoSummaryShownRef.current) {
      autoSummaryShownRef.current = true
      setShowSummary(true)
    }
  }, [totalCount, config.questionLimit])

  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const sessionPersistedRef = useRef(false)

  // Persist + submit as soon as the session ends (summary shown) so the
  // leaderboard the player sees right away already reflects this run —
  // not only after they choose to restart or exit.
  useEffect(() => {
    if (!showSummary || sessionPersistedRef.current) return
    sessionPersistedRef.current = true
    const updated = saveSoloHighScore(record, { streak: bestStreak, correct: correctCount, total: totalCount })
    setRecord(updated)
    // Fire-and-forget — the leaderboard is a bonus, not a blocker for exiting.
    submitScore({ name: config.player1Name || 'Jugador', questionLimit: config.questionLimit, streak: bestStreak, accuracy, score: points, total: totalCount })
  }, [showSummary, record, bestStreak, correctCount, totalCount, accuracy, points, config.player1Name, config.questionLimit])

  const persistAndExit = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current)
    onExit()
  }, [onExit])

  const restartSession = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current)
    sessionPersistedRef.current = false
    autoSummaryShownRef.current = false
    setRound(1)
    setPoints(0)
    setCorrectCount(0)
    setTotalCount(0)
    setStreak(0)
    setBestStreak(0)
    setNewRecord(false)
    setExercise(newExercise(1))
    setPhase('answering')
    clearRoundState()
    setShowSummary(false)
  }, [])

  return (
    <div className="min-h-screen overflow-y-auto text-white flex flex-col" style={{ background: 'var(--bg)' }}>
      <ScreenFlash color={flash.color} trigger={flash.trigger} />

      {/* Header: stats + record + exit */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 border-b border-white/10 flex-shrink-0" style={{ background: '#0a0a15' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowSummary(true)}
          className="font-display text-xs sm:text-sm tracking-widest text-white/50 hover:text-white px-3 py-1.5 rounded-lg btn-3d"
          style={{ background: '#16162A' }}
        >
          SALIR
        </motion.button>

        <div className="flex items-center gap-3 sm:gap-6 font-display text-xs sm:text-sm">
          <div className="flex flex-col items-center">
            <span className="text-white/30 text-[9px] sm:text-[10px] tracking-widest">PREGUNTA</span>
            <span className="text-white text-base sm:text-lg tabular-nums">{Math.min(totalCount + 1, config.questionLimit)}/{config.questionLimit}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/30 text-[9px] sm:text-[10px] tracking-widest">PUNTAJE</span>
            <span className="text-[#FFD700] text-base sm:text-lg tabular-nums">{points}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/30 text-[9px] sm:text-[10px] tracking-widest">CORRECTAS</span>
            <span className="text-[#00E676] text-base sm:text-lg">{correctCount}/{totalCount} <span className="text-white/30 text-xs">({accuracy}%)</span></span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-white/30 text-[9px] sm:text-[10px] tracking-widest">RACHA</span>
            <span className="text-[#FFD700] text-base sm:text-lg">
              {streak} 🔥{streak >= 3 && <span className="text-[#FF6B00] text-xs sm:text-sm"> ×{(1 + (streak - 2) * 0.1).toFixed(1)}</span>}
            </span>
          </div>
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-white/30 text-[10px] tracking-widest">RÉCORD</span>
            <span className="text-white/60 text-sm">racha {Math.max(record.bestStreak, bestStreak)} · {Math.max(record.bestAccuracy, accuracy >= 0 && totalCount >= 10 ? accuracy : record.bestAccuracy)}%</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={bgm.toggleMute}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm sm:text-base flex-shrink-0"
          style={{ background: '#1a1a2e', border: '2px solid #333', boxShadow: '2px 2px 0 #000' }}
          title={bgm.muted ? 'Activar música' : 'Silenciar música'}
        >
          {bgm.muted ? '🔇' : '🔊'}
        </motion.button>
      </div>

      {/* New record toast */}
      <AnimatePresence>
        {newRecord && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onAnimationComplete={() => setTimeout(() => setNewRecord(false), 1800)}
            className="flex-shrink-0 px-6 py-1.5 flex items-center justify-center"
            style={{ background: 'rgba(255,215,0,0.15)', borderBottom: '2px solid rgba(255,215,0,0.4)' }}
          >
            <span className="font-display text-[#FFD700] text-xs sm:text-sm tracking-widest">🏆 ¡NUEVO RÉCORD DE RACHA!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 px-2 sm:px-4 py-4 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-2xl"
          >
            <p className="font-display text-white/40 text-xs tracking-widest">{exerciseLabel(exercise)}</p>
            <div
              className="rounded-3xl px-5 sm:px-7 md:px-10 py-4 sm:py-5 md:py-6"
              style={{ background: 'var(--surface)', border: '3px solid #000', boxShadow: '6px 6px 0 #000' }}
            >
              {renderExercise(exercise, exercise.type === 'compare' ? selectedOption : null)}
            </div>
            <FractionVisualizer fraction={exercise.fractionA} color="#FFD700" />

            <div className="flex flex-col items-center gap-1.5 w-full">
              <OptionGrid
                options={exercise.options}
                locked={phase === 'answering'}
                onSelect={handleSelect}
                wrongSelections={selectedOption && feedback === 'wrong' ? [selectedOption] : []}
                correctAnswer={String(exercise.answer)}
                revealCorrect={revealCorrect}
                color="blue"
              />
              {phase === 'answering' && !feedback && (
                <div className="mt-1">
                  <Timer
                    key={timerKey}
                    seconds={config.timerSeconds}
                    onExpire={handleTimerExpire}
                    running={phase === 'answering' && !feedback}
                  />
                </div>
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
              {feedback && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextRound}
                  className="mt-1 btn-3d font-display text-black text-base px-8 py-2 rounded-xl tracking-widest"
                  style={{ background: '#FFD700' }}
                >
                  CONTINUAR
                </motion.button>
              )}
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
              className="absolute font-display text-6xl sm:text-7xl md:text-9xl pointer-events-none drop-shadow-[4px_4px_0_#000]"
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

      {/* Arcade-style game-over page */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex flex-col items-center justify-center text-center px-4 py-8 gap-4 overflow-y-auto"
            style={{ background: 'var(--bg)' }}
          >
            <motion.p
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="font-display text-3xl sm:text-5xl text-[#FF3B3B] tracking-widest drop-shadow-[3px_3px_0_#000]"
            >
              FIN DE LA PARTIDA
            </motion.p>

            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', bounce: 0.6 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="font-display text-sm sm:text-base text-white/40 tracking-widest">PUNTAJE</span>
              <span className="font-display text-5xl sm:text-7xl text-[#FFD700] drop-shadow-[4px_4px_0_#000] tabular-nums">{points}</span>
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-display text-sm sm:text-base">
              <div className="flex flex-col items-center bg-[#16162A] rounded-xl px-4 py-2 card-3d">
                <span className="text-white/30 text-[10px] tracking-widest">CORRECTAS</span>
                <span className="text-[#00E676] text-lg">{correctCount}/{totalCount} <span className="text-white/30 text-xs">({accuracy}%)</span></span>
              </div>
              <div className="flex flex-col items-center bg-[#16162A] rounded-xl px-4 py-2 card-3d">
                <span className="text-white/30 text-[10px] tracking-widest">MEJOR RACHA</span>
                <span className="text-[#FFD700] text-lg">{bestStreak} 🔥</span>
              </div>
            </div>

            <div className="w-full max-w-xs">
              <Leaderboard questionLimit={config.questionLimit} />
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={restartSession}
                className="btn-3d font-display text-black text-lg px-8 py-3 rounded-xl tracking-widest"
                style={{ background: '#FFD700' }}
              >
                REINICIAR
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={persistAndExit}
                className="btn-3d font-display text-white text-base px-8 py-2 rounded-xl tracking-widest"
                style={{ background: '#16162A' }}
              >
                VOLVER AL INICIO
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
