# Sound & Visual Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "espectacular" level audio (Web Audio API synthesis) and visual feedback (canvas-confetti + framer-motion) to every key game event.

**Architecture:** Sound effects live in a single `useSoundFX` hook that lazily creates one `AudioContext`. Visual effects are isolated overlay components (`ScreenFlash`, `FloatingDamage`, `ComebackEntrance`) driven by trigger counters passed as props. `HealthBar` gains a `shaking` prop and enhanced streak badge. `Game.tsx` wires everything together at each game event.

**Tech Stack:** React 19, framer-motion (already installed), canvas-confetti (new), Web Audio API (browser built-in)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/hooks/useSoundFX.ts` | All audio synthesis |
| Create | `src/components/effects/ScreenFlash.tsx` | Full-viewport color flash |
| Create | `src/components/effects/FloatingDamage.tsx` | Rising damage number |
| Create | `src/components/effects/ComebackEntrance.tsx` | Dramatic comeback overlay |
| Modify | `src/components/HealthBar.tsx` | Add `shaking` prop + multiplier badge |
| Modify | `src/components/Game.tsx` | Wire all effects at game events |

---

### Task 1: Install canvas-confetti

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
pnpm add canvas-confetti
pnpm add -D @types/canvas-confetti
```

Expected: no errors, `canvas-confetti` appears in `package.json` dependencies.

- [ ] **Step 2: Verify build still works**

```bash
pnpm build
```

Expected: `✓ built in ...ms` with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add canvas-confetti dependency"
```

---

### Task 2: Create `useSoundFX` hook

**Files:**
- Create: `src/hooks/useSoundFX.ts`

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/useSoundFX.ts
import { useRef, useCallback } from 'react'

type PlayerKey = 'q' | 'p'

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext {
  if (!ref.current) {
    ref.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return ref.current
}

function tone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakGain = 0.3,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

export function useSoundFX() {
  const ctxRef = useRef<AudioContext | null>(null)

  const playBuzzer = useCallback((player: PlayerKey) => {
    const ctx = getCtx(ctxRef)
    const freq = player === 'q' ? 880 : 440
    tone(ctx, freq, 'square', ctx.currentTime, 0.08, 0.25)
    tone(ctx, freq * 1.5, 'square', ctx.currentTime + 0.05, 0.06, 0.15)
  }, [])

  const playCorrect = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    tone(ctx, 523, 'sine', t, 0.12, 0.3)
    tone(ctx, 659, 'sine', t + 0.1, 0.12, 0.3)
    tone(ctx, 784, 'sine', t + 0.2, 0.2, 0.35)
  }, [])

  const playWrong = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    tone(ctx, 220, 'sawtooth', t, 0.08, 0.3)
    tone(ctx, 180, 'sawtooth', t + 0.07, 0.08, 0.25)
    tone(ctx, 140, 'sawtooth', t + 0.14, 0.12, 0.2)
  }, [])

  const playStreakHit = useCallback((streak: number) => {
    const ctx = getCtx(ctxRef)
    const base = 523 + (streak - 3) * 60
    tone(ctx, base, 'sine', ctx.currentTime, 0.15, 0.25)
    tone(ctx, base * 1.25, 'sine', ctx.currentTime + 0.12, 0.1, 0.2)
  }, [])

  const playDamage = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2)
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    osc.start(t)
    osc.stop(t + 0.25)
  }, [])

  const playComebackActivate = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    // Rumble
    tone(ctx, 55, 'sawtooth', t, 0.6, 0.35)
    tone(ctx, 60, 'sawtooth', t + 0.05, 0.6, 0.3)
    // Rising siren
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, t + 0.3)
    osc.frequency.linearRampToValueAtTime(900, t + 1.0)
    gain.gain.setValueAtTime(0.25, t + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
    osc.start(t + 0.3)
    osc.stop(t + 1.2)
  }, [])

  const playComebackTick = useCallback((n: number) => {
    const ctx = getCtx(ctxRef)
    const freq = 440 + n * 150
    tone(ctx, freq, 'sine', ctx.currentTime, 0.15, 0.3)
  }, [])

  const playComebackSuccess = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    tone(ctx, 523, 'sine', t, 0.15, 0.35)
    tone(ctx, 659, 'sine', t + 0.12, 0.15, 0.35)
    tone(ctx, 784, 'sine', t + 0.24, 0.15, 0.35)
    tone(ctx, 1047, 'sine', t + 0.36, 0.3, 0.4)
  }, [])

  const playComebackFail = useCallback(() => {
    const ctx = getCtx(ctxRef)
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 1.2)
    gain.gain.setValueAtTime(0.35, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3)
    osc.start(t)
    osc.stop(t + 1.35)
  }, [])

  return {
    playBuzzer,
    playCorrect,
    playWrong,
    playStreakHit,
    playDamage,
    playComebackActivate,
    playComebackTick,
    playComebackSuccess,
    playComebackFail,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSoundFX.ts
git commit -m "feat: add useSoundFX hook with Web Audio API synthesis"
```

---

### Task 3: Create `ScreenFlash` component

**Files:**
- Create: `src/components/effects/ScreenFlash.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/effects/ScreenFlash.tsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  color: string
  trigger: number   // increment this to fire a flash
  opacity?: number  // default 0.45
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
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ScreenFlash.tsx
git commit -m "feat: add ScreenFlash effect component"
```

---

### Task 4: Create `FloatingDamage` component

**Files:**
- Create: `src/components/effects/FloatingDamage.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/effects/FloatingDamage.tsx
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  value: string      // e.g. "-25", "×1.3 💥33", "½ -12"
  side: 'left' | 'right'
  trigger: number   // increment to show
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
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/FloatingDamage.tsx
git commit -m "feat: add FloatingDamage effect component"
```

---

### Task 5: Create `ComebackEntrance` component

**Files:**
- Create: `src/components/effects/ComebackEntrance.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/effects/ComebackEntrance.tsx
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
          {/* Pulsing vignette border */}
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
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ComebackEntrance.tsx
git commit -m "feat: add ComebackEntrance dramatic overlay component"
```

---

### Task 6: Update `HealthBar` — shaking + multiplier badge

**Files:**
- Modify: `src/components/HealthBar.tsx`

The current file (`src/components/HealthBar.tsx`) looks like this (read it to confirm before editing):

```tsx
// current Props interface
interface Props {
  hp: number
  maxHp: number
  side: 'left' | 'right'
  name: string
  streak: number
}
```

- [ ] **Step 1: Replace the full file content**

```tsx
// src/components/HealthBar.tsx
import { motion } from 'framer-motion'

interface Props {
  hp: number
  maxHp: number
  side: 'left' | 'right'
  name: string
  streak: number
  shaking?: boolean
}

const shakeVariants = {
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
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/HealthBar.tsx
git commit -m "feat: HealthBar shaking animation + streak multiplier badge"
```

---

### Task 7: Wire all effects in `Game.tsx`

**Files:**
- Modify: `src/components/Game.tsx`

This is the main integration task. Read `src/components/Game.tsx` fully before starting.

- [ ] **Step 1: Add imports at the top of Game.tsx**

After the existing imports, add:

```tsx
import confetti from 'canvas-confetti'
import { useSoundFX } from '../hooks/useSoundFX'
import ScreenFlash from './effects/ScreenFlash'
import FloatingDamage from './effects/FloatingDamage'
import ComebackEntrance from './effects/ComebackEntrance'
```

- [ ] **Step 2: Add effect state inside the `Game` component, after existing state declarations**

After `const jokeRoundRef = useRef<ReturnType<typeof setTimeout> | null>(null)`, add:

```tsx
  const sfx = useSoundFX()

  // flash: { color, trigger }
  const [flash, setFlash] = useState<{ color: string; trigger: number }>({ color: '#ffffff', trigger: 0 })
  const fireFlash = useCallback((color: string) => setFlash(f => ({ color, trigger: f.trigger + 1 })), [])

  // floating damage
  const [dmgQ, setDmgQ] = useState<{ value: string; trigger: number }>({ value: '', trigger: 0 })
  const [dmgP, setDmgP] = useState<{ value: string; trigger: number }>({ value: '', trigger: 0 })
  const fireDamage = useCallback((side: 'q' | 'p', value: string) => {
    if (side === 'q') setDmgQ(d => ({ value, trigger: d.trigger + 1 }))
    else setDmgP(d => ({ value, trigger: d.trigger + 1 }))
  }, [])

  // health bar shaking
  const [shakingQ, setShakingQ] = useState(false)
  const [shakingP, setShakingP] = useState(false)
  const shakePlayer = useCallback((player: PlayerKey) => {
    if (player === 'q') { setShakingQ(true); setTimeout(() => setShakingQ(false), 450) }
    else { setShakingP(true); setTimeout(() => setShakingP(false), 450) }
  }, [])

  // comeback entrance overlay
  const [showComebackEntrance, setShowComebackEntrance] = useState(false)
```

- [ ] **Step 3: Add a `fireConfetti` helper after the state block**

```tsx
  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#FFD700', '#00E676', '#1D9BF0', '#FF3B3B', '#ffffff'] })
  }, [])
```

- [ ] **Step 4: Wire buzzer sound + flash — update the keyboard handler**

Find this block inside the `useEffect` keyboard handler:

```tsx
        if (key === 'q' || key === 'p') {
          setLockedPlayer(key)
          setPhase('locked')
          setTimerKey(k => k + 1)
          setStreak(s => ({ ...s, [key === 'q' ? 'p' : 'q']: 0 }))
        }
```

Replace with:

```tsx
        if (key === 'q' || key === 'p') {
          setLockedPlayer(key)
          setPhase('locked')
          setTimerKey(k => k + 1)
          setStreak(s => ({ ...s, [key === 'q' ? 'p' : 'q']: 0 }))
          sfx.playBuzzer(key)
          fireFlash(key === 'q' ? 'rgba(29,155,240,0.5)' : 'rgba(255,59,59,0.5)')
        }
```

Note: the `useEffect` deps array will need `sfx` and `fireFlash` added. Find:

```tsx
  }, [phase, comebackPlayer, lockedPlayer, feedback, selectedOption, exercise, handleSelect])
```

Replace with:

```tsx
  }, [phase, comebackPlayer, lockedPlayer, feedback, selectedOption, exercise, handleSelect, sfx, fireFlash])
```

- [ ] **Step 5: Wire correct/wrong sounds and damage effects — update `applyCorrect`**

Find:

```tsx
  const applyCorrect = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(newStreak[scorer], false)
    const newHp = {
      ...currentHp,
      [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg),
    }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound])
```

Replace with:

```tsx
  const applyCorrect = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(newStreak[scorer], false)
    const newHp = {
      ...currentHp,
      [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg),
    }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    sfx.playCorrect()
    if (newStreak[scorer] >= 3) sfx.playStreakHit(newStreak[scorer])
    fireFlash('#00E676')
    fireConfetti()
    const multiplierLabel = newStreak[scorer] >= 3 ? `×${(1 + (newStreak[scorer] - 2) * 0.1).toFixed(1)} ` : ''
    fireDamage(other(scorer), `-${multiplierLabel}${dmg}`)
    shakePlayer(other(scorer))
    sfx.playDamage()
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound, sfx, fireFlash, fireConfetti, fireDamage, shakePlayer])
```

- [ ] **Step 6: Wire effects in `applyCorrectNoDamage`**

Find:

```tsx
  // Second player got it right — half damage, no streak multiplier
  const applyCorrectNoDamage = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(0, true)
    const newHp = { ...currentHp, [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg) }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound])
```

Replace with:

```tsx
  // Second player got it right — half damage, no streak multiplier
  const applyCorrectNoDamage = useCallback((scorer: PlayerKey, currentScores: Scores, currentHp: Record<PlayerKey, number>, currentStreak: Record<PlayerKey, number>) => {
    const newScores = { ...currentScores, [scorer]: currentScores[scorer] + 1 }
    const newStreak = { ...currentStreak, [scorer]: currentStreak[scorer] + 1, [other(scorer)]: 0 }
    const dmg = calcDamage(0, true)
    const newHp = { ...currentHp, [other(scorer)]: Math.max(0, currentHp[other(scorer)] - dmg) }
    setScores(newScores)
    setStreak(newStreak)
    setHp(newHp)
    setFeedback('correct')
    sfx.playCorrect()
    fireFlash('#00E676')
    fireConfetti()
    fireDamage(other(scorer), `½ -${dmg}`)
    shakePlayer(other(scorer))
    sfx.playDamage()
    setTimeout(() => nextRound(newScores, newHp), 1500)
  }, [nextRound, sfx, fireFlash, fireConfetti, fireDamage, shakePlayer])
```

- [ ] **Step 7: Wire wrong answer sound in `applySecondChanceFail` and `applyNoScore`**

Find:

```tsx
  // Both players failed — no penalty, just next round
  const applySecondChanceFail = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound])
```

Replace with:

```tsx
  // Both players failed — no penalty, just next round
  const applySecondChanceFail = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    sfx.playWrong()
    fireFlash('rgba(255,59,59,0.35)')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound, sfx, fireFlash])
```

Find:

```tsx
  const applyNoScore = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound])
```

Replace with:

```tsx
  const applyNoScore = useCallback((currentScores: Scores, currentHp: Record<PlayerKey, number>) => {
    setFeedback('wrong')
    sfx.playWrong()
    fireFlash('rgba(255,59,59,0.35)')
    setTimeout(() => nextRound(currentScores, currentHp), 1500)
  }, [nextRound, sfx, fireFlash])
```

- [ ] **Step 8: Wire comeback effects in `startComeback`**

Find:

```tsx
  const startComeback = useCallback((loser: PlayerKey) => {
    setComebackPlayer(loser)
    setComebackCount(0)
    resetRound(round)
  }, [round, resetRound])
```

Replace with:

```tsx
  const startComeback = useCallback((loser: PlayerKey) => {
    setComebackPlayer(loser)
    setComebackCount(0)
    sfx.playComebackActivate()
    setShowComebackEntrance(true)
    setTimeout(() => setShowComebackEntrance(false), 2500)
    resetRound(round)
  }, [round, resetRound, sfx])
```

- [ ] **Step 9: Wire comeback tick and success in `applyComebackCorrect`**

Find:

```tsx
  const applyComebackCorrect = useCallback((currentHp: Record<PlayerKey, number>, loser: PlayerKey) => {
    const next = comebackCount + 1
    setFeedback('correct')
    if (next >= COMEBACK_NEEDED) {
      const newHp = { ...currentHp, [loser]: COMEBACK_HP }
      setHp(newHp)
      setComebackPlayer(null)
      setComebackCount(0)
      const next2 = round + 1
      setRound(next2)
      setTimeout(() => resetRound(next2), 1500)
    } else {
      setComebackCount(next)
      setTimeout(() => resetRound(round), 1500)
    }
  }, [comebackCount, round, resetRound])
```

Replace with:

```tsx
  const applyComebackCorrect = useCallback((currentHp: Record<PlayerKey, number>, loser: PlayerKey) => {
    const next = comebackCount + 1
    setFeedback('correct')
    if (next >= COMEBACK_NEEDED) {
      const newHp = { ...currentHp, [loser]: COMEBACK_HP }
      setHp(newHp)
      setComebackPlayer(null)
      setComebackCount(0)
      sfx.playComebackSuccess()
      fireFlash('#FFD700')
      fireConfetti()
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ['#FFD700', '#FF6B00', '#ffffff'] })
      const next2 = round + 1
      setRound(next2)
      setTimeout(() => resetRound(next2), 1500)
    } else {
      setComebackCount(next)
      sfx.playComebackTick(next)
      fireFlash('rgba(255,59,59,0.4)')
      setTimeout(() => resetRound(round), 1500)
    }
  }, [comebackCount, round, resetRound, sfx, fireFlash, fireConfetti])
```

- [ ] **Step 10: Wire comeback fail sound in `applyComebackFail`**

Find:

```tsx
  const applyComebackFail = useCallback((currentScores: Scores, loser: PlayerKey) => {
    setFeedback('wrong')
    setTimeout(() => endGame(other(loser), currentScores), 1500)
  }, [endGame])
```

Replace with:

```tsx
  const applyComebackFail = useCallback((currentScores: Scores, loser: PlayerKey) => {
    setFeedback('wrong')
    sfx.playComebackFail()
    fireFlash('rgba(0,0,0,0.7)')
    setTimeout(() => endGame(other(loser), currentScores), 1500)
  }, [endGame, sfx, fireFlash])
```

- [ ] **Step 11: Add effect components to the JSX**

Find the opening tag of the returned JSX:

```tsx
    <div className="h-screen overflow-hidden text-white flex flex-col" style={{ background: 'var(--bg)' }}>
```

Replace with:

```tsx
    <div className="h-screen overflow-hidden text-white flex flex-col" style={{ background: 'var(--bg)' }}>
      <ScreenFlash color={flash.color} trigger={flash.trigger} />
      <FloatingDamage value={dmgQ.value} side="left" trigger={dmgQ.trigger} />
      <FloatingDamage value={dmgP.value} side="right" trigger={dmgP.trigger} />
      <ComebackEntrance
        playerName={comebackPlayer === 'q' ? p1 : p2}
        visible={showComebackEntrance}
      />
```

- [ ] **Step 12: Pass `shaking` props to HealthBar components**

Find:

```tsx
        <HealthBar hp={hp.q} maxHp={MAX_HP} side="left" name={p1} streak={streak.q} />
```

Replace with:

```tsx
        <HealthBar hp={hp.q} maxHp={MAX_HP} side="left" name={p1} streak={streak.q} shaking={shakingQ} />
```

Find:

```tsx
        <HealthBar hp={hp.p} maxHp={MAX_HP} side="right" name={p2} streak={streak.p} />
```

Replace with:

```tsx
        <HealthBar hp={hp.p} maxHp={MAX_HP} side="right" name={p2} streak={streak.p} shaking={shakingP} />
```

- [ ] **Step 13: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|✓"
```

Expected: `✓ built in ...ms` — fix any TypeScript errors before committing.

- [ ] **Step 14: Commit**

```bash
git add src/components/Game.tsx
git commit -m "feat: wire all sound and visual effects into Game"
```

---

### Task 8: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Test each effect**

Verify in order:
1. Press Q → blue flash + buzzer sound
2. Press P → red flash + different pitch buzzer
3. Select correct answer on first try → green flash + confetti + damage number floats up + health bar shakes
4. Select wrong answer → answer stays, options passed to other player
5. Both select wrong → red flash + wrong sound
6. Build a streak of 3+ for one player → 🔥×1.1 badge appears and pulses
7. Drain a player to 0 HP → ComebackEntrance overlay appears with dramatic sound
8. Complete 3 comeback correct answers → gold confetti burst + fanfare
9. Fail comeback → screen darkens + descending game-over tone

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete sound & visual effects system"
```
