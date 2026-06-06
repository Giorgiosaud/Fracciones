import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  playerName: string
  visible: boolean
}

export default function ComebackEntrance({ playerName, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: 'rgba(13,0,0,0.85)' }}
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 120px 40px rgba(255,59,59,0.6)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [1.4, 1], opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className="font-display text-7xl text-[#FF3B3B] drop-shadow-[4px_4px_0_#000] tracking-widest"
            style={{ textShadow: '0 0 40px #FF3B3B, 0 0 80px #FF3B3B' }}
          >
            🔥 COMEBACK
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl text-white tracking-widest mt-4 drop-shadow-[2px_2px_0_#000]"
          >
            {playerName}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-display text-xl text-white/50 tracking-widest mt-6"
          >
            ¡3 RESPUESTAS CORRECTAS PARA SOBREVIVIR!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
