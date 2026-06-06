import { motion } from 'framer-motion'

interface Props {
  keyLabel: string
  playerName: string
  active: boolean
  locked: boolean
  side: 'left' | 'right'
}

export default function BuzzerIndicator({ keyLabel, playerName, active, locked, side }: Props) {
  const isP1 = keyLabel === 'Q'
  const color = isP1 ? '#1D9BF0' : '#FF3B3B'
  const dimColor = isP1 ? '#0a3a5a' : '#5a0a0a'

  const bg = locked ? color : active ? dimColor : '#111'

  return (
    <div className={`flex flex-col items-center gap-1 ${side === 'left' ? 'items-start' : 'items-end'}`}>
      <span className="font-display text-lg text-white tracking-widest drop-shadow-[1px_1px_0_#000] uppercase">
        {playerName}
      </span>
      <motion.div
        animate={active && !locked ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ repeat: active && !locked ? Infinity : 0, duration: 1, ease: 'easeInOut' }}
        style={{
          background: bg,
          border: `3px solid ${locked ? '#FFD700' : '#000'}`,
          boxShadow: locked ? `0 0 16px ${color}, 4px 4px 0 #000` : '4px 4px 0 #000',
          color: locked ? '#FFD700' : active ? color : '#444',
        }}
        className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-4xl select-none cursor-default tracking-wider transition-colors"
      >
        {keyLabel}
      </motion.div>
    </div>
  )
}
