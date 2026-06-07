import { useState } from 'react'
import { motion } from 'framer-motion'
import type { GameConfig, GameMode } from '../lib/types'

interface Props {
  onStart: (config: GameConfig) => void
}

const NAMES_KEY = 'fracciones:playerNames'

function loadSavedNames(): { player1Name: string; player2Name: string } {
  try {
    const raw = localStorage.getItem(NAMES_KEY)
    if (!raw) return { player1Name: '', player2Name: '' }
    const parsed = JSON.parse(raw)
    return {
      player1Name: typeof parsed?.player1Name === 'string' ? parsed.player1Name : '',
      player2Name: typeof parsed?.player2Name === 'string' ? parsed.player2Name : '',
    }
  } catch {
    return { player1Name: '', player2Name: '' }
  }
}

function saveNames(player1Name: string, player2Name: string) {
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify({ player1Name, player2Name }))
  } catch {
    // localStorage unavailable — ignore
  }
}

export default function Home({ onStart }: Props) {
  const [mode, setMode] = useState<GameMode>('multiplayer')
  const [saved] = useState(loadSavedNames)
  const [player1Name, setPlayer1Name] = useState(saved.player1Name)
  const [player2Name, setPlayer2Name] = useState(saved.player2Name)
  const [pointsToWin, setPointsToWin] = useState(10)
  const [timerSeconds, setTimerSeconds] = useState(20)

  const handleStart = () => {
    const p1 = player1Name.trim() || 'Jugador 1'
    const p2 = player2Name.trim() || 'Jugador 2'
    saveNames(player1Name.trim(), player2Name.trim())
    onStart({ mode, player1Name: p1, player2Name: p2, pointsToWin, timerSeconds })
  }

  return (
    <div className="home-root min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 gap-4 sm:gap-6 md:gap-8 overflow-y-auto">

      {/* Title */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-center home-title"
      >
        <h1 className="font-display text-5xl sm:text-6xl md:text-8xl text-[#FFD700] drop-shadow-[4px_4px_0px_#000] tracking-wider leading-none">
          FRACCIONES
        </h1>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white drop-shadow-[3px_3px_0px_#000] tracking-widest leading-none mt-1">
          VS
        </h2>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex gap-2 sm:gap-3"
      >
        {([
          { key: 'multiplayer' as GameMode, label: '2 JUGADORES' },
          { key: 'solo' as GameMode, label: 'PRÁCTICA SOLO' },
        ]).map(({ key, label }) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.94 }}
            onClick={() => setMode(key)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-display text-sm sm:text-base tracking-widest btn-3d transition-all ${
              mode === key ? 'bg-[#FFD700] text-black' : 'bg-[#1E1E38] text-white hover:bg-[#2a2a4a]'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Players */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`home-players flex gap-3 sm:gap-6 w-full ${mode === 'solo' ? 'max-w-sm justify-center' : 'max-w-xl'}`}
      >
        {/* Player 1 (or solo player) */}
        <div className="flex-1 flex flex-col gap-2 home-player-block home-player-block-left">
          {mode === 'multiplayer' && (
            <div className="bg-[#1D9BF0] rounded-xl px-4 py-1 text-center card-3d home-key-badge">
              <span className="font-display text-base sm:text-xl md:text-2xl text-white tracking-widest">TECLA Q</span>
            </div>
          )}
          <input
            className="bg-[#16162A] rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-white placeholder-white/25 text-center text-base sm:text-lg md:text-xl font-black focus:outline-none border-3 border-transparent focus:border-[#1D9BF0] transition-colors"
            style={{ border: '3px solid #1D9BF0', boxShadow: '3px 3px 0 #000' }}
            value={player1Name}
            onChange={e => setPlayer1Name(e.target.value)}
            placeholder="Jugador 1"
            maxLength={12}
          />
        </div>

        {mode === 'multiplayer' && (
          <>
            <div className="home-vs-divider flex items-center font-display text-2xl sm:text-3xl md:text-4xl text-[#FFD700] drop-shadow-[2px_2px_0_#000] pt-6">VS</div>

            {/* Player 2 */}
            <div className="flex-1 flex flex-col gap-2 home-player-block home-player-block-right">
              <div className="bg-[#FF3B3B] rounded-xl px-4 py-1 text-center card-3d home-key-badge">
                <span className="font-display text-base sm:text-xl md:text-2xl text-white tracking-widest">TECLA P</span>
              </div>
              <input
                className="bg-[#16162A] rounded-xl px-2 sm:px-4 py-2 sm:py-3 text-white placeholder-white/25 text-center text-base sm:text-lg md:text-xl font-black focus:outline-none"
                style={{ border: '3px solid #FF3B3B', boxShadow: '3px 3px 0 #000' }}
                value={player2Name}
                onChange={e => setPlayer2Name(e.target.value)}
                placeholder="Jugador 2"
                maxLength={12}
              />
            </div>
          </>
        )}
      </motion.div>

      {/* Points selector — only relevant when there's an opponent to beat */}
      {mode === 'multiplayer' && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="home-selector flex flex-col items-center gap-2 sm:gap-3"
      >
        <span className="home-selector-label font-display text-lg sm:text-xl md:text-2xl text-white tracking-widest drop-shadow-[2px_2px_0_#000]">
          PUNTOS PARA GANAR
        </span>
        <div className="flex gap-2 sm:gap-4">
          {[5, 10, 15].map(n => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPointsToWin(n)}
              className={`w-14 h-10 sm:w-20 sm:h-14 rounded-xl font-display text-xl sm:text-2xl md:text-3xl transition-all btn-3d ${
                pointsToWin === n
                  ? 'bg-[#FFD700] text-black'
                  : 'bg-[#1E1E38] text-white hover:bg-[#2a2a4a]'
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </motion.div>
      )}

      {/* Timer selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="home-selector flex flex-col items-center gap-2 sm:gap-3"
      >
        <span className="home-selector-label font-display text-lg sm:text-xl md:text-2xl text-white tracking-widest drop-shadow-[2px_2px_0_#000]">
          TIEMPO POR PREGUNTA
        </span>
        <div className="flex gap-2 sm:gap-4">
          {[10, 15, 20, 30].map(n => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTimerSeconds(n)}
              className={`w-14 h-10 sm:w-20 sm:h-14 rounded-xl font-display text-lg sm:text-xl md:text-2xl transition-all btn-3d ${
                timerSeconds === n
                  ? 'bg-[#FFD700] text-black'
                  : 'bg-[#1E1E38] text-white hover:bg-[#2a2a4a]'
              }`}
            >
              {n}s
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Start */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', bounce: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleStart}
        className="home-start bg-[#FFD700] text-black font-display text-3xl sm:text-4xl md:text-5xl px-8 sm:px-12 md:px-16 py-3 sm:py-4 rounded-2xl tracking-widest btn-3d"
      >
        ¡JUGAR!
      </motion.button>
    </div>
  )
}
