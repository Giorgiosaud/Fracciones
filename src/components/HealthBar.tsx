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
  const barColor = pct > 0.5 ? '#00E676' : pct > 0.25 ? '#FFD700' : '#FF3B3B'
  const isRight = side === 'right'

  return (
    <div className={`flex flex-col gap-1 flex-1 min-w-0 ${isRight ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <span className="font-display text-xl text-white tracking-widest drop-shadow-[1px_1px_0_#000] uppercase">
          {name}
        </span>
        {streak >= 3 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="font-display text-lg text-orange-400 drop-shadow-[1px_1px_0_#000]"
          >
            🔥{streak}
          </motion.span>
        )}
      </div>

      {/* HP label */}
      <div className={`flex items-center gap-2 w-full ${isRight ? 'flex-row-reverse' : ''}`}>
        <span className="font-display text-sm text-[#FFD700] drop-shadow-[1px_1px_0_#000] w-12 text-center">
          HP
        </span>
        {/* Bar container */}
        <div
          className="flex-1 h-5 rounded-sm overflow-hidden"
          style={{ border: '2px solid #000', background: '#1a1a1a', boxShadow: '2px 2px 0 #000' }}
        >
          <motion.div
            className="h-full rounded-sm"
            style={{ background: barColor, originX: isRight ? 1 : 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
        <span className="font-display text-sm text-white drop-shadow-[1px_1px_0_#000] w-12 text-center">
          {hp}/{maxHp}
        </span>
      </div>
    </div>
  )
}
