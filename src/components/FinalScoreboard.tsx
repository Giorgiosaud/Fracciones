import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameConfig, PlayerKey, Scores } from '../lib/types'
import { recordWin, loadWins, clearWins, type WinRecord } from '../lib/wins'

interface Props {
  scores: Scores
  config: GameConfig
  winner: PlayerKey
  onReplay: () => void
}

function useConfetti(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 2 + 1,
      color: ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4'][Math.floor(Math.random() * 5)],
      tiltAngle: Math.random() * Math.PI * 2,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.tiltAngle += 0.1
        p.y += p.d
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tiltAngle, 0, 2 * Math.PI)
        ctx.fillStyle = p.color
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [canvas])
}

function WinBoard({ records, onClear }: { records: WinRecord[]; onClear: () => void }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="bg-slate-800 rounded-2xl p-6 w-72 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-black text-lg uppercase tracking-wide">🏆 Tabla de Victorias</h2>
        <button
          onClick={onClear}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Borrar
        </button>
      </div>
      {records.length === 0 ? (
        <p className="text-slate-500 text-sm text-center">Sin victorias aún</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.slice(0, 5).map((r, i) => (
            <li key={r.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{medals[i] ?? '🎖️'}</span>
                <span className="text-white font-semibold text-sm">{r.name}</span>
              </div>
              <span className="text-yellow-400 font-black">{r.wins} {r.wins === 1 ? 'victoria' : 'victorias'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FinalScoreboard({ scores, config, winner, onReplay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useConfetti(canvasRef.current)

  const winnerName = winner === 'q' ? config.player1Name : config.player2Name
  const winnerColor = winner === 'q' ? 'text-indigo-400' : 'text-pink-400'

  const [records, setRecords] = useState<WinRecord[]>([])

  useEffect(() => {
    const updated = recordWin(winnerName)
    setRecords(updated)
  }, [winnerName])

  const handleClear = () => {
    clearWins()
    setRecords([])
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-8 relative overflow-hidden p-8">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-center z-10"
      >
        <div className="text-6xl mb-2">🏆</div>
        <div className="text-2xl text-slate-400 mb-1">¡Ganador!</div>
        <div className={`text-6xl font-black ${winnerColor}`}>{winnerName}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-12 z-10 bg-slate-800 rounded-2xl px-10 py-6 border border-slate-700"
      >
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-1">{config.player1Name}</div>
          <div className="text-5xl font-black text-indigo-400">{scores.q}</div>
          <div className="text-slate-500 text-xs mt-1">puntos</div>
        </div>
        <div className="text-slate-600 text-4xl self-center">vs</div>
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-1">{config.player2Name}</div>
          <div className="text-5xl font-black text-pink-400">{scores.p}</div>
          <div className="text-slate-500 text-xs mt-1">puntos</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="z-10"
      >
        <WinBoard records={records} onClear={handleClear} />
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onReplay}
        className="z-10 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xl px-10 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/40 active:scale-95"
      >
        Jugar de nuevo
      </motion.button>
    </div>
  )
}
