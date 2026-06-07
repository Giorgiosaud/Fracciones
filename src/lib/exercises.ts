import type { Exercise, ExerciseType, FractionValue } from './types'
import { compareFractions, simplifyFraction, addFractions, subtractFractions, gcd, fractionToString, normalizeAnswer } from './fractions'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

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

// ── Compare ──────────────────────────────────────────────────────────────────

function makeCompare(round: number): Exercise {
  const a = randomFraction(round)
  const b = randomFraction(round)
  const answer = compareFractions(a, b)
  // compare always has exactly 3 options — show all of them
  const options = shuffle(['>', '<', '='])
  return { type: 'compare', fractionA: a, fractionB: b, answer, displayAnswer: answer, options }
}

// ── Simplify ─────────────────────────────────────────────────────────────────

function simplifyDistractors(correct: FractionValue, denominator: number, round: number): string[] {
  const distractors: string[] = []
  const ds = denoms(round)
  // wrong numerators with same denominator
  for (let i = 0; i < 4 && distractors.length < 4; i++) {
    const n = randInt(1, denominator - 1)
    const cand = fractionToString(simplifyFraction({ numerator: n, denominator }))
    if (cand !== fractionToString(correct)) distractors.push(cand)
  }
  // fractions with different denominators
  for (let i = 0; i < 6 && distractors.length < 5; i++) {
    const d = ds[randInt(0, ds.length - 1)]
    const n = randInt(1, d - 1)
    const cand = fractionToString(simplifyFraction({ numerator: n, denominator: d }))
    if (cand !== fractionToString(correct) && !distractors.includes(cand)) distractors.push(cand)
  }
  return distractors
}

function makeSimplify(round: number): Exercise {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const factor = randInt(2, 4)
  const n = randInt(1, d - 1)
  const g = gcd(n, d)
  const numerator = (n / g) * factor
  const denominator = d * factor
  const simplified = simplifyFraction({ numerator, denominator })
  const answer = fractionToString(simplified)
  const distractors = simplifyDistractors(simplified, denominator, round)
  const options = shuffle(dedupe([answer, ...distractors]).slice(0, 6))
  return { type: 'simplify', fractionA: { numerator, denominator }, answer, displayAnswer: answer, options }
}

// ── Amplify ──────────────────────────────────────────────────────────────────

function amplifyDistractors(correct: number, targetDenominator: number): string[] {
  const distractors: string[] = []
  const seen = new Set([correct])
  // near the correct answer
  const deltas = [-3, -2, -1, 1, 2, 3, 4, 5, -4, -5]
  for (const d of deltas) {
    const cand = correct + d
    if (cand > 0 && cand < targetDenominator && !seen.has(cand)) {
      distractors.push(String(cand))
      seen.add(cand)
    }
    if (distractors.length >= 5) break
  }
  // fallback: random numbers in range (bounded — small denominators have few candidates)
  for (let i = 0; i < 30 && distractors.length < 5; i++) {
    const cand = randInt(1, targetDenominator - 1)
    if (!seen.has(cand)) { distractors.push(String(cand)); seen.add(cand) }
  }
  return distractors
}

function makeAmplify(round: number): Exercise {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const n = randInt(1, d - 1)
  const factor = randInt(2, 4)
  const targetDenominator = d * factor
  const targetNumerator = n * factor
  const answer = String(targetNumerator)
  const distractors = amplifyDistractors(targetNumerator, targetDenominator)
  const options = shuffle(dedupe([answer, ...distractors]).slice(0, 6))
  return {
    type: 'amplify',
    fractionA: { numerator: n, denominator: d },
    targetDenominator,
    answer,
    displayAnswer: answer,
    options,
  }
}

// ── Mixed ────────────────────────────────────────────────────────────────────

function mixedDistractors(whole: number, rem: number, d: number): string[] {
  const correct = `${whole} y ${rem}/${d}`
  const distractors: string[] = []
  const seen = new Set([correct])

  // wrong remainder, same whole and denominator
  for (let r = 1; r < d && distractors.length < 3; r++) {
    if (r !== rem) {
      const cand = `${whole} y ${r}/${d}`
      if (!seen.has(cand)) { distractors.push(cand); seen.add(cand) }
    }
  }
  // wrong whole, same remainder and denominator
  for (let w = 1; w <= 4 && distractors.length < 5; w++) {
    if (w !== whole) {
      const cand = `${w} y ${rem}/${d}`
      if (!seen.has(cand)) { distractors.push(cand); seen.add(cand) }
    }
  }
  // different denominator distractors
  const altD = d === 4 ? 3 : 4
  for (let r = 1; r < altD && distractors.length < 5; r++) {
    const cand = `${whole} y ${r}/${altD}`
    if (!seen.has(cand)) { distractors.push(cand); seen.add(cand) }
  }
  return distractors
}

function makeMixed(round: number): Exercise {
  const whole = randInt(1, 3)
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const rem = randInt(1, d - 1)
  const numerator = whole * d + rem
  const displayAnswer = `${whole} y ${rem}/${d}`
  const distractors = mixedDistractors(whole, rem, d)
  const options = shuffle(dedupe([displayAnswer, ...distractors]).slice(0, 6))
  return {
    type: 'mixed',
    fractionA: { numerator, denominator: d },
    wholePartA: whole,
    answer: displayAnswer,
    displayAnswer,
    options,
  }
}

// ── Add / Subtract ───────────────────────────────────────────────────────────

function addSubtractDistractors(correct: FractionValue, a: FractionValue, b: FractionValue, isAdd: boolean): string[] {
  const distractors: string[] = []
  const seen = new Set([fractionToString(correct)])

  const add = (cand: FractionValue) => {
    const s = fractionToString(simplifyFraction(cand))
    if (!seen.has(s)) { distractors.push(s); seen.add(s) }
  }

  // common mistake: operate numerators and denominators directly
  add({ numerator: isAdd ? a.numerator + b.numerator : a.numerator - b.numerator, denominator: a.denominator + b.denominator })
  // common mistake: operate numerators, keep one denominator
  add({ numerator: isAdd ? a.numerator + b.numerator : a.numerator - b.numerator, denominator: a.denominator })
  add({ numerator: isAdd ? a.numerator + b.numerator : a.numerator - b.numerator, denominator: b.denominator })
  // forgetting to simplify
  add({ numerator: correct.numerator * 2, denominator: correct.denominator * 2 })
  // off-by-one numerator
  add({ numerator: correct.numerator + 1, denominator: correct.denominator })
  if (correct.numerator > 1) add({ numerator: correct.numerator - 1, denominator: correct.denominator })

  // fallback: random nearby fractions (bounded — the candidate space is finite)
  for (let i = 0; i < 30 && distractors.length < 5; i++) {
    add(randomFraction(5))
  }
  return distractors
}

function makeAddSubtract(round: number, isAdd: boolean): Exercise {
  let a = randomFraction(round)
  let b = randomFraction(round)
  if (!isAdd && compareFractions(a, b) === '<') [a, b] = [b, a]
  const result = isAdd ? addFractions(a, b) : subtractFractions(a, b)
  const simplified = simplifyFraction(result)
  const answer = fractionToString(simplified)
  const distractors = addSubtractDistractors(simplified, a, b, isAdd)
  const options = shuffle(dedupe([answer, ...distractors]).slice(0, 6))
  return {
    type: isAdd ? 'add' : 'subtract',
    fractionA: a,
    fractionB: b,
    answer,
    displayAnswer: answer,
    options,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

const generators: Record<ExerciseType, (round: number) => Exercise> = {
  compare: makeCompare,
  simplify: makeSimplify,
  amplify: makeAmplify,
  mixed: makeMixed,
  add: (round) => makeAddSubtract(round, true),
  subtract: (round) => makeAddSubtract(round, false),
}

const types: ExerciseType[] = ['compare', 'simplify', 'amplify', 'mixed', 'add', 'subtract']

export function generateExercise(round: number): Exercise {
  const type = types[randInt(0, types.length - 1)]
  return generators[type](round)
}

export function validateAnswer(exercise: Exercise, userInput: string): boolean {
  const normalized = normalizeAnswer(userInput).toLowerCase()
  const expected = normalizeAnswer(String(exercise.answer)).toLowerCase()
  return normalized.replace(/\s/g, '') === expected.replace(/\s/g, '')
}
