import { useState } from 'react'
import { motion } from 'framer-motion'
import type { GameConfig } from '../lib/types'

interface Props {
  onStart: (config: GameConfig) => void
}

export default function Home({ onStart }: Props) {
  const [player1Name, setPlayer1Name] = useState('Jugador 1')
  const [player2Name, setPlayer2Name] = useState('Jugador 2')
  const [pointsToWin, setPointsToWin] = useState(10)

  const handleStart = () => {
    if (!player1Name.trim() || !player2Name.trim()) return
    onStart({ player1Name: player1Name.trim(), player2Name: player2Name.trim(), pointsToWin })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">

      {/* Title */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-center"
      >
        <h1 className="font-display text-8xl text-[#FFD700] drop-shadow-[4px_4px_0px_#000] tracking-wider leading-none">
          FRACCIONES
        </h1>
        <h2 className="font-display text-6xl text-white drop-shadow-[3px_3px_0px_#000] tracking-widest leading-none mt-1">
          VS
        </h2>
      </motion.div>

      {/* Players */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-6 w-full max-w-xl"
      >
        {/* Player 1 */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-[#1D9BF0] rounded-xl px-4 py-1 text-center card-3d">
            <span className="font-display text-2xl text-white tracking-widest">TECLA Q</span>
          </div>
          <input
            className="bg-[#16162A] rounded-xl px-4 py-3 text-white text-center text-xl font-black focus:outline-none border-3 border-transparent focus:border-[#1D9BF0] transition-colors"
            style={{ border: '3px solid #1D9BF0', boxShadow: '3px 3px 0 #000' }}
            value={player1Name}
            onChange={e => setPlayer1Name(e.target.value)}
            maxLength={12}
          />
        </div>

        <div className="flex items-center font-display text-4xl text-[#FFD700] drop-shadow-[2px_2px_0_#000] pt-6">VS</div>

        {/* Player 2 */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-[#FF3B3B] rounded-xl px-4 py-1 text-center card-3d">
            <span className="font-display text-2xl text-white tracking-widest">TECLA P</span>
          </div>
          <input
            className="bg-[#16162A] rounded-xl px-4 py-3 text-white text-center text-xl font-black focus:outline-none"
            style={{ border: '3px solid #FF3B3B', boxShadow: '3px 3px 0 #000' }}
            value={player2Name}
            onChange={e => setPlayer2Name(e.target.value)}
            maxLength={12}
          />
        </div>
      </motion.div>

      {/* Points selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="font-display text-2xl text-white tracking-widest drop-shadow-[2px_2px_0_#000]">
          PUNTOS PARA GANAR
        </span>
        <div className="flex gap-4">
          {[5, 10, 15].map(n => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPointsToWin(n)}
              className={`w-20 h-14 rounded-xl font-display text-3xl transition-all btn-3d ${
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

      {/* Start */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', bounce: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleStart}
        className="bg-[#FFD700] text-black font-display text-5xl px-16 py-4 rounded-2xl tracking-widest btn-3d"
      >
        ¡JUGAR!
      </motion.button>
    </div>
  )
}
