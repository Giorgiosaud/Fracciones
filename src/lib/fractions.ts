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

export function addFractions(a: FractionValue, b: FractionValue): FractionValue {
  const fr = new Fraction(a.numerator, a.denominator).add(new Fraction(b.numerator, b.denominator))
  return { numerator: Number(fr.n) * Number(fr.s), denominator: Number(fr.d) }
}

export function subtractFractions(a: FractionValue, b: FractionValue): FractionValue {
  const fr = new Fraction(a.numerator, a.denominator).sub(new Fraction(b.numerator, b.denominator))
  return { numerator: Number(fr.n) * Number(fr.s), denominator: Number(fr.d) }
}

export function simplifyFraction(f: FractionValue): FractionValue {
  const fr = new Fraction(f.numerator, f.denominator)
  return { numerator: Number(fr.n) * Number(fr.s), denominator: Number(fr.d) }
}

export function fractionToString(f: FractionValue): string {
  return `${f.numerator}/${f.denominator}`
}

export function normalizeAnswer(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}
