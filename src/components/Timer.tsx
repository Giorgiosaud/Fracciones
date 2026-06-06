import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  seconds: number
  onExpire: () => void
  running: boolean
}

export default function Timer({ seconds, onExpire, running }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (!running) return
    if (remaining <= 0) { onExpire(); return }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [running, remaining, onExpire])

  const pct = remaining / seconds
  const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <motion.span
        className="text-5xl font-black tabular-nums"
        style={{ color }}
        animate={{ scale: remaining <= 3 && running ? [1, 1.2, 1] : 1 }}
        transition={{ repeat: remaining <= 3 && running ? Infinity : 0, duration: 0.6 }}
      >
        {remaining}
      </motion.span>
      <span className="text-slate-500 text-xs mt-1">segundos</span>
    </div>
  )
}
