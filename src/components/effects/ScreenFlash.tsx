import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  color: string
  trigger: number
  opacity?: number
}

export default function ScreenFlash({ color, trigger, opacity = 0.45 }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 350)
    return () => clearTimeout(id)
  }, [trigger])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={trigger}
          initial={{ opacity }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none z-50"
          style={{ background: color }}
        />
      )}
    </AnimatePresence>
  )
}
