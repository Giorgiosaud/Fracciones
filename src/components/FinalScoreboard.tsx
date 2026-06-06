import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameConfig, PlayerKey, Scores } from '../lib/types'
import { recordWin, clearWins, type WinRecord } from '../lib/wins'

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
      color: ['#1D9BF0', '#FF3B3B', '#FFD700', '#00E676', '#FF9F0A'][Math.floor(Math.random() * 5)],
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
    <div
      className="card-3d rounded-2xl p-6 w-72"
      style={{ background: 'var(--surface)' }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-[#FFD700] text-xl tracking-widest drop-shadow-[1px_1px_0_#000]">🏆 VICTORIAS</h2>
        <button
          onClick={onClear}
          className="font-display text-white/30 hover:text-white/60 text-xs tracking-widest transition-colors"
        >
          BORRAR
        </button>
      </div>
      {records.length === 0 ? (
        <p className="text-white/30 text-sm text-center font-display tracking-widest">SIN VICTORIAS AÚN</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.slice(0, 5).map((r, i) => (
            <li key={r.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{medals[i] ?? '🎖️'}</span>
                <span className="text-white font-bold text-sm">{r.name}</span>
              </div>
              <span className="font-display text-[#FFD700] drop-shadow-[1px_1px_0_#000]">{r.wins} {r.wins === 1 ? 'victoria' : 'victorias'}</span>
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
  const winnerColor = winner === 'q' ? '#1D9BF0' : '#FF3B3B'

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
    <div className="min-h-screen text-white flex flex-col items-center justify-center gap-8 relative overflow-hidden p-8" style={{ background: 'var(--bg)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-center z-10"
      >
        <div className="text-6xl mb-2">🏆</div>
        <div className="font-display text-2xl text-white/40 tracking-widest mb-1">¡GANADOR!</div>
        <div
          className="font-display text-7xl drop-shadow-[4px_4px_0_#000]"
          style={{ color: winnerColor, textShadow: `0 0 30px ${winnerColor}` }}
        >
          {winnerName}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-12 z-10 card-3d rounded-2xl px-10 py-6"
        style={{ background: 'var(--surface)' }}
      >
        <div className="text-center">
          <div className="font-display text-white/40 text-sm tracking-widest mb-1">{config.player1Name}</div>
          <div className="font-display text-6xl drop-shadow-[2px_2px_0_#000]" style={{ color: '#1D9BF0', textShadow: '0 0 12px #1D9BF0' }}>{scores.q}</div>
          <div className="font-display text-white/20 text-xs tracking-widest mt-1">PUNTOS</div>
        </div>
        <div className="font-display text-[#FFD700] text-4xl self-center drop-shadow-[2px_2px_0_#000]">VS</div>
        <div className="text-center">
          <div className="font-display text-white/40 text-sm tracking-widest mb-1">{config.player2Name}</div>
          <div className="font-display text-6xl drop-shadow-[2px_2px_0_#000]" style={{ color: '#FF3B3B', textShadow: '0 0 12px #FF3B3B' }}>{scores.p}</div>
          <div className="font-display text-white/20 text-xs tracking-widest mt-1">PUNTOS</div>
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReplay}
        className="z-10 btn-3d font-display text-black text-2xl px-12 py-4 rounded-2xl tracking-widest"
        style={{ background: '#FFD700' }}
      >
        ¡JUGAR DE NUEVO!
      </motion.button>
    </div>
  )
}
