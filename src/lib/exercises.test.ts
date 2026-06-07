import { describe, it, expect } from 'vitest'
import { generateExercise, validateAnswer } from './exercises'
import { addFractions, subtractFractions, simplifyFraction, fractionToString } from './fractions'

describe('generateExercise', () => {
  it('returns an exercise with a type and answer', () => {
    const ex = generateExercise(1)
    expect(ex.type).toBeDefined()
    expect(ex.answer).toBeDefined()
    expect(ex.displayAnswer).toBeDefined()
  })

  it('compare exercise has fractionA and fractionB', () => {
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

describe.each(['add', 'subtract'] as const)('%s exercise', (type) => {
  function findExercise() {
    for (let i = 0; i < 200; i++) {
      const ex = generateExercise(1)
      if (ex.type === type) return ex
    }
    throw new Error(`no ${type} exercise generated in 200 tries`)
  }

  it('has fractionA, fractionB and a fraction- or whole-number-shaped answer', () => {
    const ex = findExercise()
    expect(ex.fractionA).toBeDefined()
    expect(ex.fractionB).toBeDefined()
    // Whole-number results (e.g. 1/2 - 1/2) render as plain integers ("0",
    // "2"), not as "0/1" — that's how a kid would naturally write them.
    expect(ex.answer).toMatch(/^-?\d+(\/\d+)?$/)
    expect(ex.displayAnswer).toBe(ex.answer)
  })

  it('answer matches the simplified result of the operation', () => {
    const ex = findExercise()
    const expected =
      type === 'add'
        ? addFractions(ex.fractionA, ex.fractionB!)
        : subtractFractions(ex.fractionA, ex.fractionB!)
    expect(ex.answer).toBe(fractionToString(simplifyFraction(expected)))
  })

  it('options contain the correct answer exactly once and at least 2 options', () => {
    const ex = findExercise()
    expect(ex.options.filter((o) => o === ex.answer)).toHaveLength(1)
    expect(ex.options.length).toBeGreaterThanOrEqual(2)
  })

  it('validateAnswer accepts the correct answer and rejects a different one', () => {
    const ex = findExercise()
    expect(validateAnswer(ex, ex.answer as string)).toBe(true)
    const wrong = ex.options.find((o) => o !== ex.answer)
    if (wrong) expect(validateAnswer(ex, wrong)).toBe(false)
  })
})

describe('validateAnswer', () => {
  it('accepts correct answer', () => {
    const ex = generateExercise(1)
    expect(validateAnswer(ex, ex.answer as string)).toBe(true)
  })

  it('rejects wrong answer', () => {
    const ex = generateExercise(1)
    const wrong = ex.answer === '>' ? '<' : ex.answer === '3/4' ? '1/2' : 'WRONG'
    expect(validateAnswer(ex, wrong)).toBe(false)
  })
})
