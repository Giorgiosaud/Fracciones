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
    tone(ctx, 55, 'sawtooth', t, 0.6, 0.35)
    tone(ctx, 60, 'sawtooth', t + 0.05, 0.6, 0.3)
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
