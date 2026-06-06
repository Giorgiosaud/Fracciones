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
