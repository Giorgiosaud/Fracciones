import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  seconds: number
  onExpire: () => void
  running: boolean
}

export default function Timer({ seconds, onExpire, running }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => { setRemaining(seconds) }, [seconds])

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) { onExpire(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [running, remaining, onExpire])

  const pct = remaining / seconds
  const color = pct > 0.5 ? '#00E676' : pct > 0.25 ? '#FFD700' : '#FF3B3B'
  const urgent = remaining <= 3 && running

  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <motion.div
        animate={urgent ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ repeat: urgent ? Infinity : 0, duration: 0.5 }}
        style={{ color, textShadow: `0 0 20px ${color}` }}
        className="font-display text-6xl tabular-nums leading-none drop-shadow-[2px_2px_0_#000]"
      >
        {remaining}
      </motion.div>
      {/* Sand-clock progress bar */}
      <div
        className="w-full h-3 rounded-full overflow-hidden"
        style={{ background: '#1a1a1a', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, originX: 1 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>
      <span className="font-display text-xs text-white/40 tracking-widest">SEG</span>
    </div>
  )
}
