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
  it('trims input', () => {
    expect(normalizeAnswer('  3/4  ')).toBe('3/4')
    expect(normalizeAnswer('>')).toBe('>')
  })
})
