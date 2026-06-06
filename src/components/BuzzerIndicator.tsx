import { motion } from 'framer-motion'

interface Props {
  keyLabel: string
  playerName: string
  active: boolean
  locked: boolean
  side: 'left' | 'right'
}

export default function BuzzerIndicator({ keyLabel, playerName, active, locked, side }: Props) {
  const bgColor = locked
    ? 'bg-indigo-500 shadow-indigo-500/50 shadow-lg'
    : active
    ? 'bg-slate-700'
    : 'bg-slate-800 opacity-40'

  return (
    <div className={`flex flex-col items-center gap-2 ${side === 'left' ? 'items-start' : 'items-end'}`}>
      <span className="text-slate-400 text-sm font-medium">{playerName}</span>
      <motion.div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white cursor-default select-none ${bgColor}`}
        animate={active && !locked ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={{ repeat: active && !locked ? Infinity : 0, duration: 1.2, ease: 'easeInOut' }}
      >
        {keyLabel}
      </motion.div>
    </div>
  )
}
