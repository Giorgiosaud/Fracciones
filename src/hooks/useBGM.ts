import { useRef, useCallback, useState } from 'react'

const BPM = 138
const BEAT = 60 / BPM
const HALF = BEAT / 2

// Frequencies: 0 = rest
const D4 = 293.66, E4 = 329.63, G4 = 392.00, A4 = 440.00, C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 784.00
const C2 = 65.41, G2 = 98.00, F2 = 87.31, A2 = 110.00

// 4-bar melody (8th notes = 32 slots)
const MELODY: number[] = [
  C5, 0, E5, 0, G5, E5, C5, 0,
  A4, 0, C5, D5, C5, 0, A4, 0,
  G4, 0, A4, C5, D5, 0, C5, A4,
  G4, A4, G4, E4, D4, 0, E4, 0,
]

// 4-bar bass (quarter notes = 16 slots)
const BASS: number[] = [
  C2, C2, G2, C2,
  F2, F2, A2, F2,
  C2, C2, G2, C2,
  F2, G2, F2, C2,
]

function scheduleNote(
  ctx: AudioContext,
  master: GainNode,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gain: number,
) {
  if (freq === 0) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g)
  g.connect(master)
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(gain, startTime)
  g.gain.setValueAtTime(gain, startTime + duration * 0.8)
  g.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

function scheduleLoop(ctx: AudioContext, master: GainNode, startTime: number) {
  const loopDuration = BEAT * 4 * 4 // 4 bars

  // Melody (8th notes)
  MELODY.forEach((freq, i) => {
    scheduleNote(ctx, master, freq, 'square', startTime + i * HALF, HALF * 0.7, 0.12)
  })

  // Bass (quarter notes)
  BASS.forEach((freq, i) => {
    scheduleNote(ctx, master, freq, 'triangle', startTime + i * BEAT, BEAT * 0.6, 0.18)
  })

  return loopDuration
}

export function useBGM() {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextLoopRef = useRef<number>(0)
  const runningRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(0.5)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      masterRef.current = ctxRef.current.createGain()
      masterRef.current.connect(ctxRef.current.destination)
      masterRef.current.gain.value = 0.5
    }
    return { ctx: ctxRef.current, master: masterRef.current! }
  }, [])

  const scheduleNext = useCallback(() => {
    if (!runningRef.current) return
    const { ctx, master } = getCtx()
    const loopDuration = scheduleLoop(ctx, master, nextLoopRef.current)
    const msUntilNext = (nextLoopRef.current - ctx.currentTime + loopDuration - 0.1) * 1000
    nextLoopRef.current += loopDuration
    timerRef.current = setTimeout(scheduleNext, Math.max(0, msUntilNext))
  }, [getCtx])

  const start = useCallback(() => {
    const { ctx } = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    if (runningRef.current) return
    runningRef.current = true
    nextLoopRef.current = ctx.currentTime + 0.1
    scheduleNext()
  }, [getCtx, scheduleNext])

  const stop = useCallback(() => {
    runningRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const toggleMute = useCallback(() => {
    if (!masterRef.current) return
    setMuted(m => {
      const next = !m
      masterRef.current!.gain.value = next ? 0 : volume
      return next
    })
  }, [volume])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    if (masterRef.current && !muted) {
      masterRef.current.gain.value = v
    }
  }, [muted])

  return { start, stop, toggleMute, setVolume, muted, volume }
}
