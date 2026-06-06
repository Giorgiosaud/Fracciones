import { motion } from 'framer-motion'

interface Props {
  hp: number
  maxHp: number
  side: 'left' | 'right'
  name: string
  streak: number
}

export default function HealthBar({ hp, maxHp, side, name, streak }: Props) {
  const pct = Math.max(0, hp / maxHp)
  const color =
    pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`flex flex-col gap-1 w-64 ${side === 'right' ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-white font-black text-sm uppercase tracking-widest">{name}</span>
        {streak >= 3 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-yellow-400 text-xs font-bold"
          >
            🔥 ×{streak}
          </motion.span>
        )}
      </div>
      <div
        className={`w-full h-6 bg-slate-800 rounded border-2 border-slate-600 overflow-hidden flex ${
          side === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        <motion.div
          className="h-full rounded-sm"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="text-slate-500 text-xs">{hp}/{maxHp}</span>
    </div>
  )
}
