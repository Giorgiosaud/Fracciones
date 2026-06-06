import type { Exercise, ExerciseType, FractionValue } from './types'
import { compareFractions, simplifyFraction, gcd, fractionToString, normalizeAnswer } from './fractions'

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
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

function makeCompare(round: number): Exercise {
  const a = randomFraction(round)
  const b = randomFraction(round)
  const answer = compareFractions(a, b)
  return { type: 'compare', fractionA: a, fractionB: b, answer, displayAnswer: answer }
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
  return { type: 'simplify', fractionA: { numerator, denominator }, answer, displayAnswer: answer }
}

function makeAmplify(round: number): Exercise {
  const ds = denoms(round)
  const d = ds[randInt(0, ds.length - 1)]
  const n = randInt(1, d - 1)
  const factor = randInt(2, 4)
  const targetDenominator = d * factor
  const targetNumerator = n * factor
  return {
    type: 'amplify',
    fractionA: { numerator: n, denominator: d },
    targetDenominator,
    answer: String(targetNumerator),
    displayAnswer: `${targetNumerator}`,
  }
}

function makeMixed(round: number): Exercise {
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

  if (exercise.type === 'compare' || exercise.type === 'amplify') {
    return normalized === expected
  }

  if (exercise.type === 'simplify') {
    return normalized.replace(/\s/g, '') === expected.replace(/\s/g, '')
  }

  if (exercise.type === 'mixed') {
    return normalized.replace(/\s/g, '') === expected.replace(/\s/g, '')
  }

  return false
}
