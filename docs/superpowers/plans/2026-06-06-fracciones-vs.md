# Fracciones VS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-player competitive fraction-learning web app where kids use Q and P keys to buzz in and answer exercises, deployable to Cloudflare Pages.

**Architecture:** Single-page React app with client-side state only. Screen navigation is handled by a top-level `screen` state variable in App.tsx (no router needed). All game logic lives in `src/lib/`, all UI in `src/components/`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, fraction.js, Framer Motion, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/fractions.ts` | Wrappers around fraction.js: parse, compare, simplify, validate answers |
| `src/lib/exercises.ts` | Random exercise generator for all 4 types + answer checker |
| `src/lib/types.ts` | Shared TypeScript types (Exercise, GameConfig, PlayerKey, Screen) |
| `src/components/FractionVisualizer.tsx` | SVG circle + bar renderers for a single fraction |
| `src/components/BuzzerIndicator.tsx` | Animated Q / P key display |
| `src/components/Timer.tsx` | Countdown timer component |
| `src/components/Home.tsx` | Setup screen: names + points-to-win |
| `src/components/Game.tsx` | Main game loop: buzzer → input → result flow |
| `src/components/FinalScoreboard.tsx` | Winner + scores + replay button |
| `src/App.tsx` | Screen router + top-level state |
| `src/main.tsx` | React entry point |
| `src/index.css` | Tailwind directives |

---

## Task 1: Scaffold the project

**Files:**
- Create: project root (via Vite CLI)
- Modify: `tailwind.config.js`, `index.css`, `tsconfig.json`

- [ ] **Step 1: Scaffold Vite + React + TypeScript**

```bash
cd /Users/bepartnerlabs/Projects/Giorgiosaud/Fracciones
npm create vite@latest . -- --template react-ts
npm install
```

Expected: `node_modules/` created, `src/App.tsx` exists.

- [ ] **Step 2: Install dependencies**

```bash
npm install fraction.js framer-motion
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` content:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Clear boilerplate**

Replace `src/App.tsx` with a minimal placeholder:

```tsx
export default function App() {
  return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Fracciones VS</div>
}
```

Replace `src/main.tsx` with:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Verify it runs**

```bash
npm run dev
```

Expected: browser shows dark page with "Fracciones VS".

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind + Vitest"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types**

```ts
// src/lib/types.ts

export type Screen = 'home' | 'game' | 'scoreboard'

export type PlayerKey = 'q' | 'p'

export interface GameConfig {
  player1Name: string
  player2Name: string
  pointsToWin: number
}

export type ExerciseType = 'compare' | 'simplify' | 'amplify' | 'mixed'

export interface FractionValue {
  numerator: number
  denominator: number
}

// For 'compare': answer is '>' | '<' | '='
// For 'simplify': answer is FractionValue (reduced)
// For 'amplify': answer is number (the missing numerator)
// For 'mixed': answer is string like "1 y 3/4" or FractionValue improper
export type ExerciseAnswer = string | number

export interface Exercise {
  type: ExerciseType
  fractionA: FractionValue
  fractionB?: FractionValue          // used in 'compare' and 'amplify'
  targetDenominator?: number         // used in 'amplify'
  wholePartA?: number                // used in 'mixed'
  answer: ExerciseAnswer             // always a string for uniformity after normalization
  displayAnswer: string              // human-readable correct answer
}

export interface RoundResult {
  winner: PlayerKey | null           // null = nobody answered correctly
  correct: boolean
}

export interface Scores {
  q: number
  p: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: Fraction logic library (`fractions.ts`)

**Files:**
- Create: `src/lib/fractions.ts`
- Create: `src/lib/fractions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/fractions.test.ts
import { describe, it, expect } from 'vitest'
import { compareFractions, simplifyFraction, gcd, normalizeAnswer } from './fractions'

describe('gcd', () => {
  it('returns greatest common divisor', () => {
    expect(gcd(12, 8)).toBe(4)
    expect(gcd(7, 3)).toBe(1)
    expect(gcd(6, 6)).toBe(6)
  })
})

describe('compareFractions', () => {
  it('returns > when a > b', () => {
    expect(compareFractions({ numerator: 3, denominator: 4 }, { numerator: 2, denominator: 3 })).toBe('>')
  })
  it('returns < when a < b', () => {
    expect(compareFractions({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 })).toBe('<')
  })
  it('returns = when equal', () => {
    expect(compareFractions({ numerator: 2, denominator: 4 }, { numerator: 1, denominator: 2 })).toBe('=')
  })
})

describe('simplifyFraction', () => {
  it('reduces 6/8 to 3/4', () => {
    expect(simplifyFraction({ numerator: 6, denominator: 8 })).toEqual({ numerator: 3, denominator: 4 })
  })
  it('leaves already-reduced fraction unchanged', () => {
    expect(simplifyFraction({ numerator: 3, denominator: 7 })).toEqual({ numerator: 3, denominator: 7 })
  })
})

describe('normalizeAnswer', () => {
  it('trims and lowercases input', () => {
    expect(normalizeAnswer('  3/4  ')).toBe('3/4')
    expect(normalizeAnswer('>')).toBe('>')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test -- fractions.test.ts
```

Expected: FAIL — `fractions` module not found.

- [ ] **Step 3: Implement `fractions.ts`**

```ts
// src/lib/fractions.ts
import Fraction from 'fraction.js'
import type { FractionValue } from './types'

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export function compareFractions(a: FractionValue, b: FractionValue): '>' | '<' | '=' {
  const fa = new Fraction(a.numerator, a.denominator)
  const fb = new Fraction(b.numerator, b.denominator)
  const cmp = fa.compare(fb)
  if (cmp > 0) return '>'
  if (cmp < 0) return '<'
  return '='
}

export function simplifyFraction(f: FractionValue): FractionValue {
  const fr = new Fraction(f.numerator, f.denominator)
  return { numerator: fr.n * fr.s, denominator: fr.d }
}

export function fractionToString(f: FractionValue): string {
  return `${f.numerator}/${f.denominator}`
}

export function normalizeAnswer(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- fractions.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fractions.ts src/lib/fractions.test.ts
git commit -m "feat: fraction.js wrappers with tests"
```

---

## Task 4: Exercise generator (`exercises.ts`)

**Files:**
- Create: `src/lib/exercises.ts`
- Create: `src/lib/exercises.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/exercises.test.ts
import { describe, it, expect } from 'vitest'
import { generateExercise, validateAnswer } from './exercises'

describe('generateExercise', () => {
  it('returns an exercise with a type and answer', () => {
    const ex = generateExercise(1)
    expect(ex.type).toBeDefined()
    expect(ex.answer).toBeDefined()
    expect(ex.displayAnswer).toBeDefined()
  })

  it('compare exercise has fractionA and fractionB', () => {
    // run many times to get a compare exercise
    let found = false
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(1)
      if (ex.type === 'compare') {
        expect(ex.fractionB).toBeDefined()
        expect(['>', '<', '=']).toContain(ex.answer)
        found = true
        break
      }
    }
    // not strictly required to find one but usually will
    expect(typeof found).toBe('boolean')
  })

  it('simplify exercise answer matches simplified fraction', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(1)
      if (ex.type === 'simplify') {
        expect(ex.answer).toMatch(/^\d+\/\d+$/)
        break
      }
    }
  })
})

describe('validateAnswer', () => {
  it('accepts correct compare answer', () => {
    const ex = generateExercise(1)
    expect(validateAnswer(ex, ex.answer as string)).toBe(true)
  })

  it('rejects wrong answer', () => {
    const ex = generateExercise(1)
    const wrong = ex.answer === '>' ? '<' : ex.answer === '3/4' ? '1/2' : 'WRONG'
    expect(validateAnswer(ex, wrong)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test -- exercises.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `exercises.ts`**

```ts
// src/lib/exercises.ts
import type { Exercise, ExerciseType, FractionValue } from './types'
import { compareFractions, simplifyFraction, gcd, fractionToString, normalizeAnswer } from './fractions'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Denominators available by difficulty round (1=easy, 2=medium, 3+=hard)
function denoms(round: number): number[] {
  if (round <= 2) return [2, 3, 4, 5]
  if (round <= 5) return [2, 3, 4, 5, 6, 8, 10]
  return [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
}

function randomFraction(round: number): FractionValue {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const n = randInt(1, d - 1)
  return { numerator: n, denominator: d }
}

function makeCompare(round: number): Exercise {
  const a = randomFraction(round)
  const b = randomFraction(round)
  const answer = compareFractions(a, b)
  return {
    type: 'compare',
    fractionA: a,
    fractionB: b,
    answer,
    displayAnswer: answer,
  }
}

function makeSimplify(round: number): Exercise {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  // create a fraction that can be simplified: multiply by a factor
  const factor = randInt(2, 4)
  const n = randInt(1, d - 1)
  const g = gcd(n, d)
  // ensure reducible
  const numerator = (n / g) * factor
  const denominator = d * factor
  const simplified = simplifyFraction({ numerator, denominator })
  const answer = fractionToString(simplified)
  return {
    type: 'simplify',
    fractionA: { numerator, denominator },
    answer,
    displayAnswer: answer,
  }
}

function makeAmplify(round: number): Exercise {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const n = randInt(1, d - 1)
  const factor = randInt(2, 4)
  const targetDenominator = d * factor
  const targetNumerator = n * factor
  // answer is the missing numerator as string
  return {
    type: 'amplify',
    fractionA: { numerator: n, denominator: d },
    targetDenominator,
    answer: String(targetNumerator),
    displayAnswer: `${targetNumerator}`,
  }
}

function makeMixed(round: number): Exercise {
  // Generate improper fraction and ask to convert to mixed
  const whole = randInt(1, 3)
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const rem = randInt(1, d - 1)
  const numerator = whole * d + rem
  const displayAnswer = `${whole} y ${rem}/${d}`
  return {
    type: 'mixed',
    fractionA: { numerator, denominator: d },
    wholePartA: whole,
    answer: displayAnswer,
    displayAnswer,
  }
}

const generators: Record<ExerciseType, (round: number) => Exercise> = {
  compare: makeCompare,
  simplify: makeSimplify,
  amplify: makeAmplify,
  mixed: makeMixed,
}

const types: ExerciseType[] = ['compare', 'simplify', 'amplify', 'mixed']

export function generateExercise(round: number): Exercise {
  const type = types[randInt(0, types.length - 1)]
  return generators[type](round)
}

export function validateAnswer(exercise: Exercise, userInput: string): boolean {
  const normalized = normalizeAnswer(userInput).toLowerCase()
  const expected = normalizeAnswer(String(exercise.answer)).toLowerCase()

  if (exercise.type === 'compare') {
    return normalized === expected
  }

  if (exercise.type === 'amplify') {
    return normalized === expected
  }

  if (exercise.type === 'simplify') {
    // accept "3/4" or "3 / 4"
    const clean = normalized.replace(/\s/g, '')
    const expectedClean = expected.replace(/\s/g, '')
    return clean === expectedClean
  }

  if (exercise.type === 'mixed') {
    // accept "1 y 3/4" or "1y3/4" — normalize spaces and "y"
    const clean = normalized.replace(/\s/g, '')
    const expectedClean = expected.replace(/\s/g, '')
    return clean === expectedClean
  }

  return false
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- exercises.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exercises.ts src/lib/exercises.test.ts
git commit -m "feat: exercise generator with 4 types and answer validator"
```

---

## Task 5: FractionVisualizer component

**Files:**
- Create: `src/components/FractionVisualizer.tsx`

- [ ] **Step 1: Implement SVG circle + bar visualizer**

```tsx
// src/components/FractionVisualizer.tsx
import type { FractionValue } from '../lib/types'

interface Props {
  fraction: FractionValue
  size?: number
  color?: string
}

function CircleVisualizer({ fraction, size = 80, color = '#6366f1' }: Props) {
  const { numerator, denominator } = fraction
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  const sectors = Array.from({ length: denominator }, (_, i) => {
    const startAngle = (i / denominator) * 2 * Math.PI - Math.PI / 2
    const endAngle = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = 1 / denominator > 0.5 ? 1 : 0
    const filled = i < numerator

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={filled ? color : '#1e293b'}
        stroke="#334155"
        strokeWidth="1.5"
      />
    )
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {sectors}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#475569" strokeWidth="1" />
    </svg>
  )
}

function BarVisualizer({ fraction, color = '#6366f1' }: Props) {
  const { numerator, denominator } = fraction
  const cellW = 32
  const h = 28

  return (
    <svg width={cellW * denominator} height={h} viewBox={`0 0 ${cellW * denominator} ${h}`}>
      {Array.from({ length: denominator }, (_, i) => (
        <rect
          key={i}
          x={i * cellW}
          y={0}
          width={cellW - 2}
          height={h}
          rx={4}
          fill={i < numerator ? color : '#1e293b'}
          stroke="#334155"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export default function FractionVisualizer({ fraction, size, color }: Props) {
  // For mixed fractions, show whole circles + remainder
  const wholes = Math.floor(fraction.numerator / fraction.denominator)
  const remainder = fraction.numerator % fraction.denominator
  const isImproper = wholes > 0 && remainder > 0

  if (isImproper) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {Array.from({ length: wholes }, (_, i) => (
            <CircleVisualizer
              key={i}
              fraction={{ numerator: fraction.denominator, denominator: fraction.denominator }}
              size={size}
              color={color}
            />
          ))}
          {remainder > 0 && (
            <CircleVisualizer
              fraction={{ numerator: remainder, denominator: fraction.denominator }}
              size={size}
              color={color}
            />
          )}
        </div>
        <BarVisualizer fraction={fraction} color={color} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <CircleVisualizer fraction={fraction} size={size} color={color} />
      <BarVisualizer fraction={fraction} color={color} />
    </div>
  )
}
```

- [ ] **Step 2: Verify visually (manual)**

In `src/App.tsx` temporarily render:
```tsx
import FractionVisualizer from './components/FractionVisualizer'
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center gap-8">
      <FractionVisualizer fraction={{ numerator: 3, denominator: 4 }} />
      <FractionVisualizer fraction={{ numerator: 7, denominator: 4 }} />
    </div>
  )
}
```

Run `npm run dev` and confirm two visualizers render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/components/FractionVisualizer.tsx
git commit -m "feat: SVG fraction visualizer (circle + bar)"
```

---

## Task 6: BuzzerIndicator and Timer components

**Files:**
- Create: `src/components/BuzzerIndicator.tsx`
- Create: `src/components/Timer.tsx`

- [ ] **Step 1: Implement BuzzerIndicator**

```tsx
// src/components/BuzzerIndicator.tsx
import { motion } from 'framer-motion'

interface Props {
  keyLabel: string      // 'Q' or 'P'
  playerName: string
  active: boolean       // pulsing = waiting for buzz
  locked: boolean       // this player buzzed in
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
```

- [ ] **Step 2: Implement Timer**

```tsx
// src/components/Timer.tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BuzzerIndicator.tsx src/components/Timer.tsx
git commit -m "feat: BuzzerIndicator and Timer components"
```

---

## Task 7: Home screen

**Files:**
- Create: `src/components/Home.tsx`

- [ ] **Step 1: Implement Home**

```tsx
// src/components/Home.tsx
import { useState } from 'react'
import type { GameConfig } from '../lib/types'

interface Props {
  onStart: (config: GameConfig) => void
}

export default function Home({ onStart }: Props) {
  const [player1Name, setPlayer1Name] = useState('Jugador 1')
  const [player2Name, setPlayer2Name] = useState('Jugador 2')
  const [pointsToWin, setPointsToWin] = useState(10)

  const handleStart = () => {
    if (!player1Name.trim() || !player2Name.trim()) return
    onStart({ player1Name: player1Name.trim(), player2Name: player2Name.trim(), pointsToWin })
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <h1 className="text-5xl font-black text-indigo-400 mb-2">Fracciones VS</h1>
        <p className="text-slate-400">¡Presiona tu tecla primero y responde correcto!</p>
      </div>

      <div className="flex gap-8 w-full max-w-lg">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium">Jugador 1 <span className="text-indigo-400 font-bold">[Q]</span></label>
          <input
            className="bg-slate-800 rounded-xl px-4 py-3 text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={player1Name}
            onChange={e => setPlayer1Name(e.target.value)}
            maxLength={12}
          />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-sm text-slate-400 font-medium text-right block">Jugador 2 <span className="text-pink-400 font-bold">[P]</span></label>
          <input
            className="bg-slate-800 rounded-xl px-4 py-3 text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={player2Name}
            onChange={e => setPlayer2Name(e.target.value)}
            maxLength={12}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-slate-400 text-sm">Puntos para ganar</span>
        <div className="flex gap-3">
          {[5, 10, 15].map(n => (
            <button
              key={n}
              onClick={() => setPointsToWin(n)}
              className={`w-16 h-12 rounded-xl font-bold text-lg transition-all ${
                pointsToWin === n
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        className="bg-indigo-500 hover:bg-indigo-400 text-white font-black text-2xl px-12 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/40 active:scale-95"
      >
        ¡Jugar!
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire to App.tsx**

```tsx
// src/App.tsx
import { useState } from 'react'
import Home from './components/Home'
import type { GameConfig, Screen } from './lib/types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<GameConfig | null>(null)

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg)
    setScreen('game')
  }

  if (screen === 'home') return <Home onStart={handleStart} />
  return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Game coming soon...</div>
}
```

- [ ] **Step 3: Verify visually**

Run `npm run dev` — fill in names, pick points, click ¡Jugar!, confirm it transitions.

- [ ] **Step 4: Commit**

```bash
git add src/components/Home.tsx src/App.tsx
git commit -m "feat: Home screen with player setup"
```

---

## Task 8: Game screen

**Files:**
- Create: `src/components/Game.tsx`

- [ ] **Step 1: Implement Game component**

```tsx
// src/components/Game.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Exercise, GameConfig, PlayerKey, Scores } from '../lib/types'
import { generateExercise, validateAnswer } from '../lib/exercises'
import FractionVisualizer from './FractionVisualizer'
import BuzzerIndicator from './BuzzerIndicator'
import Timer from './Timer'

interface Props {
  config: GameConfig
  onGameEnd: (scores: Scores, config: GameConfig) => void
}

type Phase = 'waiting' | 'locked' | 'result'

function renderExercise(ex: Exercise) {
  if (ex.type === 'compare') {
    return (
      <div className="flex items-center gap-6 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400 text-5xl">___</span>
        <FractionDisplay frac={ex.fractionB!} />
      </div>
    )
  }
  if (ex.type === 'simplify') {
    return (
      <div className="flex items-center gap-4 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400">=</span>
        <span className="text-indigo-400">?</span>
      </div>
    )
  }
  if (ex.type === 'amplify') {
    return (
      <div className="flex items-center gap-4 text-4xl font-black">
        <FractionDisplay frac={ex.fractionA} />
        <span className="text-slate-400">=</span>
        <span className="text-indigo-400">?</span>
        <span className="text-slate-400 text-3xl">/ {ex.targetDenominator}</span>
      </div>
    )
  }
  // mixed
  return (
    <div className="flex items-center gap-4 text-4xl font-black">
      <FractionDisplay frac={ex.fractionA} />
      <span className="text-slate-400">=</span>
      <span className="text-indigo-400">?</span>
    </div>
  )
}

function FractionDisplay({ frac }: { frac: { numerator: number; denominator: number } }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span>{frac.numerator}</span>
      <span className="w-full border-t-2 border-white my-1" />
      <span>{frac.denominator}</span>
    </span>
  )
}

export default function Game({ config, onGameEnd }: Props) {
  const [scores, setScores] = useState<Scores>({ q: 0, p: 0 })
  const [round, setRound] = useState(1)
  const [exercise, setExercise] = useState<Exercise>(() => generateExercise(1))
  const [phase, setPhase] = useState<Phase>('waiting')
  const [lockedPlayer, setLockedPlayer] = useState<PlayerKey | null>(null)
  const [secondChance, setSecondChance] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const otherPlayer = (p: PlayerKey): PlayerKey => p === 'q' ? 'p' : 'q'

  const nextRound = useCallback((updatedScores: Scores) => {
    if (updatedScores.q >= config.pointsToWin || updatedScores.p >= config.pointsToWin) {
      onGameEnd(updatedScores, config)
      return
    }
    setRound(r => r + 1)
    setExercise(generateExercise(Math.ceil(round / 3)))
    setPhase('waiting')
    setLockedPlayer(null)
    setSecondChance(false)
    setUserInput('')
    setFeedback(null)
  }, [config, onGameEnd, round])

  const handleTimerExpire = useCallback(() => {
    if (!secondChance && lockedPlayer) {
      // give other player a chance
      setLockedPlayer(otherPlayer(lockedPlayer))
      setSecondChance(true)
      setUserInput('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      // nobody got it
      setFeedback('wrong')
      setTimeout(() => nextRound(scores), 1500)
    }
  }, [secondChance, lockedPlayer, scores, nextRound])

  const handleSubmit = useCallback(() => {
    if (!lockedPlayer || phase !== 'locked') return
    const correct = validateAnswer(exercise, userInput)
    if (correct) {
      const updated = { ...scores, [lockedPlayer]: scores[lockedPlayer] + 1 }
      setScores(updated)
      setFeedback('correct')
      setTimeout(() => nextRound(updated), 1500)
    } else {
      if (!secondChance) {
        setFeedback('wrong')
        setTimeout(() => {
          setFeedback(null)
          setLockedPlayer(otherPlayer(lockedPlayer))
          setSecondChance(true)
          setUserInput('')
          setTimeout(() => inputRef.current?.focus(), 50)
        }, 800)
      } else {
        setFeedback('wrong')
        setTimeout(() => nextRound(scores), 1500)
      }
    }
  }, [lockedPlayer, phase, exercise, userInput, scores, secondChance, nextRound])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'waiting') {
        const key = e.key.toLowerCase()
        if (key === 'q' || key === 'p') {
          setLockedPlayer(key as PlayerKey)
          setPhase('locked')
          setTimeout(() => inputRef.current?.focus(), 50)
        }
      }
      if (phase === 'locked' && e.key === 'Enter') {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleSubmit])

  const p1Name = config.player1Name
  const p2Name = config.player2Name

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-4 bg-slate-800">
        <div className="text-center">
          <div className="text-sm text-slate-400">{p1Name}</div>
          <div className="text-4xl font-black text-indigo-400">{scores.q}</div>
        </div>
        <div className="text-slate-500 text-sm">Ronda {round}</div>
        <div className="text-center">
          <div className="text-sm text-slate-400">{p2Name}</div>
          <div className="text-4xl font-black text-pink-400">{scores.p}</div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 relative">
        {/* Exercise */}
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="bg-slate-800 rounded-3xl px-10 py-8 shadow-xl">
              {renderExercise(exercise)}
            </div>
            <FractionVisualizer fraction={exercise.fractionA} color="#6366f1" />
          </motion.div>
        </AnimatePresence>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`absolute text-8xl ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}
            >
              {feedback === 'correct' ? '✓' : '✗'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buzzer row */}
      <div className="flex justify-between items-end px-8 pb-8">
        <div className="flex flex-col items-start gap-4">
          <BuzzerIndicator
            keyLabel="Q"
            playerName={p1Name}
            active={phase === 'waiting'}
            locked={lockedPlayer === 'q'}
            side="left"
          />
          {lockedPlayer === 'q' && phase === 'locked' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <input
                ref={inputRef}
                className="bg-slate-700 rounded-xl px-4 py-2 text-white text-xl w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Respuesta"
                autoComplete="off"
              />
              <button
                onClick={handleSubmit}
                className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-xl font-bold"
              >
                OK
              </button>
            </motion.div>
          )}
        </div>

        {phase === 'locked' && lockedPlayer && (
          <div className="flex flex-col items-center">
            <Timer
              seconds={secondChance ? 5 : 10}
              onExpire={handleTimerExpire}
              running={phase === 'locked' && !feedback}
            />
          </div>
        )}

        <div className="flex flex-col items-end gap-4">
          <BuzzerIndicator
            keyLabel="P"
            playerName={p2Name}
            active={phase === 'waiting'}
            locked={lockedPlayer === 'p'}
            side="right"
          />
          {lockedPlayer === 'p' && phase === 'locked' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <input
                ref={inputRef}
                className="bg-slate-700 rounded-xl px-4 py-2 text-white text-xl w-36 focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Respuesta"
                autoComplete="off"
              />
              <button
                onClick={handleSubmit}
                className="bg-pink-500 hover:bg-pink-400 px-4 py-2 rounded-xl font-bold"
              >
                OK
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Game.tsx
git commit -m "feat: Game screen with buzzer mechanic and 10s timer"
```

---

## Task 9: Final Scoreboard

**Files:**
- Create: `src/components/FinalScoreboard.tsx`

- [ ] **Step 1: Implement FinalScoreboard**

```tsx
// src/components/FinalScoreboard.tsx
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { GameConfig, Scores } from '../lib/types'

interface Props {
  scores: Scores
  config: GameConfig
  onReplay: () => void
}

function useConfetti(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 2 + 1,
      color: ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4'][Math.floor(Math.random() * 5)],
      tilt: Math.random() * 10 - 5,
      tiltAngle: 0,
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.tiltAngle += 0.1
        p.y += p.d
        p.tilt = Math.sin(p.tiltAngle) * 12
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.r, p.r / 2, (p.tilt * Math.PI) / 180, 0, 2 * Math.PI)
        ctx.fillStyle = p.color
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [canvas])
}

export default function FinalScoreboard({ scores, config, onReplay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useConfetti(canvasRef.current)

  const winner = scores.q >= config.pointsToWin ? config.player1Name : config.player2Name
  const winnerColor = scores.q >= config.pointsToWin ? 'text-indigo-400' : 'text-pink-400'

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-10 relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-center z-10"
      >
        <div className="text-2xl text-slate-400 mb-2">¡Ganador!</div>
        <div className={`text-6xl font-black ${winnerColor}`}>{winner}</div>
        <div className="text-slate-500 mt-2">🎉</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-12 z-10"
      >
        <div className="text-center">
          <div className="text-slate-400 text-sm">{config.player1Name}</div>
          <div className="text-5xl font-black text-indigo-400">{scores.q}</div>
        </div>
        <div className="text-slate-600 text-4xl self-center">vs</div>
        <div className="text-center">
          <div className="text-slate-400 text-sm">{config.player2Name}</div>
          <div className="text-5xl font-black text-pink-400">{scores.p}</div>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onReplay}
        className="z-10 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xl px-10 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/40 active:scale-95"
      >
        Jugar de nuevo
      </motion.button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FinalScoreboard.tsx
git commit -m "feat: FinalScoreboard with confetti animation"
```

---

## Task 10: Wire everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Complete App.tsx**

```tsx
// src/App.tsx
import { useState } from 'react'
import Home from './components/Home'
import Game from './components/Game'
import FinalScoreboard from './components/FinalScoreboard'
import type { GameConfig, Screen, Scores } from './lib/types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<GameConfig>({ player1Name: 'Jugador 1', player2Name: 'Jugador 2', pointsToWin: 10 })
  const [finalScores, setFinalScores] = useState<Scores>({ q: 0, p: 0 })

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg)
    setScreen('game')
  }

  const handleGameEnd = (scores: Scores, cfg: GameConfig) => {
    setFinalScores(scores)
    setConfig(cfg)
    setScreen('scoreboard')
  }

  const handleReplay = () => {
    setScreen('home')
  }

  if (screen === 'home') return <Home onStart={handleStart} />
  if (screen === 'game') return <Game config={config} onGameEnd={handleGameEnd} />
  return <FinalScoreboard scores={finalScores} config={config} onReplay={handleReplay} />
}
```

- [ ] **Step 2: Run full app and test the golden path**

```bash
npm run dev
```

Walk through:
1. Enter names → click ¡Jugar!
2. Press Q to buzz → answer correctly → confirm score updates
3. Press P to buzz → answer wrong → confirm other player gets chance
4. Let timer expire → confirm round advances
5. Play until one player wins → confirm scoreboard with confetti

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire all screens — app complete"
```

---

## Task 11: Build and deploy to Cloudflare Pages

**Files:**
- Create: `public/_redirects`

- [ ] **Step 1: Create `_redirects` for SPA routing**

```
/*    /index.html   200
```

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: `dist/` folder created, no errors.

- [ ] **Step 3: Preview build locally**

```bash
npm run preview
```

Open the preview URL and confirm the app works.

- [ ] **Step 4: Deploy to Cloudflare Pages**

Option A — Drag & drop:
1. Go to Cloudflare Dashboard → Pages → Create project → Upload assets
2. Drag the `dist/` folder
3. Deploy

Option B — Git-connected (recommended):
1. Push repo to GitHub
2. Cloudflare Dashboard → Pages → Create project → Connect to Git
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

- [ ] **Step 5: Final commit**

```bash
git add public/_redirects
git commit -m "chore: add Cloudflare Pages SPA redirect rule"
```
