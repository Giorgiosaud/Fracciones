import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  value: string
  side: 'left' | 'right'
  trigger: number
}

export default function FloatingDamage({ value, side, trigger }: Props) {
  const [items, setItems] = useState<{ id: number; value: string }[]>([])

  useEffect(() => {
    if (trigger === 0) return
    const id = trigger
    setItems(prev => [...prev, { id, value }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 1200)
  }, [trigger, value])

  return (
    <div
      className="fixed top-16 pointer-events-none z-40"
      style={{ [side === 'left' ? 'left' : 'right']: '8rem' }}
    >
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -60, opacity: 0, scale: 1.3 }}
            exit={{}}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="font-display text-2xl text-[#FF3B3B] drop-shadow-[2px_2px_0_#000] whitespace-nowrap"
            style={{ textShadow: '0 0 12px #FF3B3B' }}
          >
            {item.value}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
