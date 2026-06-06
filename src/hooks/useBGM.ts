import { useRef, useCallback, useState } from 'react'

// Normal mode notes (C major pentatonic)
const D4 = 293.66, E4 = 329.63, G4 = 392.00, A4 = 440.00, C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 784.00, A5 = 880.00
const C2 = 65.41, E2 = 82.41, G2 = 98.00, F2 = 87.31, A2 = 110.00

// Danger mode notes (A minor pentatonic: A C D E G)
const A3 = 220.00, C4 = 261.63, E3 = 164.81, G3 = 196.00
const A4d = 440.00, C5d = 523.25, E5d = 659.25, G4d = 392.00, A5d = 880.00, E4d = 329.63
const A2b = 110.00, E2b = 82.41, D2 = 73.42, G2b = 98.00

// 8-bar normal melody (8th notes = 64 slots)
const MELODY_NORMAL: number[] = [
  C5, 0,   E5, 0,   G5, E5,  C5, 0,
  A4, 0,   C5, D5,  C5, 0,   A4, 0,
  G4, 0,   A4, C5,  D5, 0,   C5, A4,
  G4, A4,  G4, E4,  D4, 0,   E4, 0,
  E5, G5,  A5, G5,  E5, D5,  C5, 0,
  A4, C5,  D5, E5,  D5, C5,  A4, G4,
  E5, 0,   D5, C5,  D5, E5,  G5, E5,
  D5, C5,  A4, 0,   G4, A4,  C5, 0,
]

// 8-bar normal bass (quarter notes = 32 slots)
const BASS_NORMAL: number[] = [
  C2, C2,  G2, C2,
  F2, F2,  A2, F2,
  C2, C2,  G2, C2,
  F2, G2,  F2, C2,
  C2, E2,  G2, A2,
  F2, A2,  C2, F2,
  G2, G2,  E2, G2,
  F2, C2,  G2, C2,
]

// 8-bar danger melody — Am pentatonic, driving pulse
const MELODY_DANGER: number[] = [
  A4d, 0,    C5d, A4d,  E5d, 0,   C5d, A4d,
  G4d, A4d,  C5d, 0,    A4d, G4d, E4d, 0,
  A4d, C5d,  E5d, C5d,  A5d, 0,   G4d, E4d,
  A4d, 0,    G4d, E4d,  C5d, A3,  E4d, 0,
  E5d, 0,    A5d, E5d,  C5d, A4d, E5d, C5d,
  A4d, G4d,  E4d, 0,    C5d, E4d, A4d, 0,
  G4d, A4d,  C5d, E5d,  A5d, G4d, E5d, C5d,
  A4d, 0,    E4d, C4,   A3,  0,   E3,  A3,
]

// 8-bar danger bass — more chromatic tension
const BASS_DANGER: number[] = [
  A2b, A2b, E2b, A2b,
  D2,  D2,  A2b, D2,
  A2b, A2b, E2b, A2b,
  D2,  E2b, D2,  A2b,
  A2b, C2,  E2b, G2b,
  D2,  A2b, D2,  E2b,
  A2b, A2b, G2b, E2b,
  D2,  A2b, E2b, A2b,
]

// suppress unused warnings — these are frequency constants used inline
void [C4, G3]

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

function scheduleLoop(
  ctx: AudioContext,
  master: GainNode,
  startTime: number,
  bpm: number,
  danger: boolean,
) {
  const beat = 60 / bpm
  const half = beat / 2
  const melody = danger ? MELODY_DANGER : MELODY_NORMAL
  const bass = danger ? BASS_DANGER : BASS_NORMAL
  const loopDuration = beat * 4 * 8

  melody.forEach((freq, i) => {
    scheduleNote(ctx, master, freq, 'square', startTime + i * half, half * 0.7, danger ? 0.14 : 0.12)
  })
  bass.forEach((freq, i) => {
    scheduleNote(ctx, master, freq, 'triangle', startTime + i * beat, beat * 0.6, danger ? 0.22 : 0.18)
  })

  return loopDuration
}

export function useBGM() {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextLoopRef = useRef<number>(0)
  const runningRef = useRef(false)
  const bpmRef = useRef(138)
  const dangerRef = useRef(false)
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
    const loopDuration = scheduleLoop(ctx, master, nextLoopRef.current, bpmRef.current, dangerRef.current)
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

  const setDanger = useCallback((on: boolean) => {
    dangerRef.current = on
  }, [])

  // streak: 0 = base BPM, each streak level above 3 adds 5 BPM, cap at 190
  const setStreak = useCallback((streak: number) => {
    const extra = streak >= 3 ? (streak - 2) * 5 : 0
    bpmRef.current = Math.min(190, 138 + extra)
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

  return { start, stop, setDanger, setStreak, toggleMute, setVolume, muted, volume }
}
