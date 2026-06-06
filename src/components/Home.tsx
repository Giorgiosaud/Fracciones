import { useState } from 'react'
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <h1 className="text-5xl font-black text-indigo-400 mb-2">Fracciones VS</h1>
        <p className="text-slate-400">¡Presiona tu tecla primero y responde correcto!</p>
      </div>

      <div className="flex gap-8 w-full max-w-lg">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium">
            Jugador 1 <span className="text-indigo-400 font-bold">[Q]</span>
          </label>
          <input
            className="bg-slate-800 rounded-xl px-4 py-3 text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={player1Name}
            onChange={e => setPlayer1Name(e.target.value)}
            maxLength={12}
          />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium text-right block">
            Jugador 2 <span className="text-pink-400 font-bold">[P]</span>
          </label>
          <input
            className="bg-slate-800 rounded-xl px-4 py-3 text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={player2Name}
            onChange={e => setPlayer2Name(e.target.value)}
            maxLength={12}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-slate-400 text-sm">Puntos para ganar</span>
        <div className="flex gap-3">
          {[5, 10, 15].map(n => (
            <button
              key={n}
              onClick={() => setPointsToWin(n)}
              className={`w-16 h-12 rounded-xl font-bold text-lg transition-all ${
                pointsToWin === n
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl px-8 py-4 text-center text-sm text-slate-400">
        <p className="mb-1">Tecla <span className="text-indigo-400 font-bold">Q</span> — {player1Name || 'Jugador 1'}</p>
        <p>Tecla <span className="text-pink-400 font-bold">P</span> — {player2Name || 'Jugador 2'}</p>
      </div>

      <button
        onClick={handleStart}
        className="bg-indigo-500 hover:bg-indigo-400 text-white font-black text-2xl px-12 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/40 active:scale-95"
      >
        ¡Jugar!
      </button>
    </div>
  )
}
