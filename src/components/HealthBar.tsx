import { motion, type Variants } from 'framer-motion'

interface Props {
  hp: number
  maxHp: number
  side: 'left' | 'right'
  name: string
  streak: number
  shaking?: boolean
}

const shakeVariants: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  idle: { x: 0 },
}

export default function HealthBar({ hp, maxHp, side, name, streak, shaking = false }: Props) {
  const pct = Math.max(0, hp / maxHp)
  const barColor = pct > 0.5 ? '#00E676' : pct > 0.25 ? '#FFD700' : '#FF3B3B'
  const isRight = side === 'right'
  const multiplier = streak >= 3 ? (1 + (streak - 2) * 0.1).toFixed(1) : null

  return (
    <motion.div
      className={`flex flex-col gap-1 flex-1 min-w-0 ${isRight ? 'items-end' : 'items-start'}`}
      variants={shakeVariants}
      animate={shaking ? 'shake' : 'idle'}
    >
      <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <span className="font-display text-xl text-white tracking-widest drop-shadow-[1px_1px_0_#000] uppercase">
          {name}
        </span>
        {streak >= 3 && (
          <motion.span
            key={streak}
            initial={{ scale: 1.5 }}
            animate={{ scale: [1.3, 1] }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className="font-display text-lg drop-shadow-[1px_1px_0_#000] flex items-center gap-0.5"
            style={{ color: '#FF6B00', textShadow: `0 0 ${8 + (streak - 3) * 4}px #FF6B00` }}
          >
            🔥×{multiplier}
          </motion.span>
        )}
      </div>

      <div className={`flex items-center gap-2 w-full ${isRight ? 'flex-row-reverse' : ''}`}>
        <span className="font-display text-sm text-[#FFD700] drop-shadow-[1px_1px_0_#000] w-12 text-center">
          HP
        </span>
        <div
          className="flex-1 h-5 rounded-sm overflow-hidden flex"
          style={{
            border: '2px solid #000',
            background: '#1a1a1a',
            boxShadow: '2px 2px 0 #000',
            justifyContent: isRight ? 'flex-start' : 'flex-end',
          }}
        >
          <motion.div
            className="h-full rounded-sm"
            style={{ background: barColor }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
        <span className="font-display text-sm text-white drop-shadow-[1px_1px_0_#000] w-12 text-center">
          {hp}/{maxHp}
        </span>
      </div>
    </motion.div>
  )
}
