# Sound & Visual Effects — Fracciones VS

**Date:** 2026-06-06

## Overview

Add "espectacular" level audio and visual feedback to the game using Web Audio API (sounds synthesized in code) and `canvas-confetti` (particles). No audio files required.

## New Files

### `src/hooks/useSoundFX.ts`
Web Audio API hook exposing named functions. Each sound is built from oscillators + gain envelopes (attack/decay/release). Single `AudioContext` created lazily on first call (required by browser autoplay policy).

| Function | Sound Description |
|---|---|
| `playBuzzer(player)` | Short sharp beep — different pitch per player (Q higher, P lower) |
| `playCorrect()` | Ascending major chord, bright timbre |
| `playWrong()` | Descending buzz, square wave |
| `playStreakHit(streak)` | Pitch rises with streak level |
| `playDamage()` | Low percussive thud |
| `playComebackActivate()` | Low rumble + rising siren tone |
| `playComebackTick(n)` | Short ascending bip, pitch increases with n |
| `playComebackSuccess()` | Short fanfare (3-note ascending) |
| `playComebackFail()` | Descending dramatic tone, game-over feel |

### `src/components/effects/ScreenFlash.tsx`
Full-viewport colored overlay rendered via `AnimatePresence` + framer-motion. Accepts `color` and `trigger` (incremented int). Flashes opacity 0.4 → 0 in ~300ms. Used for:
- Buzzer press (player color: blue or red)
- Correct answer (green)
- Wrong answer (red, lower opacity)
- Comeback success (gold)

### `src/components/effects/FloatingDamage.tsx`
Animated number (`-25`, `×1.3 💥33`, `½`) that rises from the damaged player's health bar and fades out over 1s. Receives `value`, `side` (left/right), and `trigger`. Uses framer-motion `y` + `opacity` animation.

### `src/components/effects/ComebackEntrance.tsx`
Full-screen dramatic overlay shown for ~2s when comeback activates. Contains:
- Pulsing red vignette border
- "🔥 COMEBACK" text with scale animation
- Player name with shake effect
- Fades out automatically

## Changes to Existing Files

### `src/components/HealthBar.tsx`
Add `shaking` boolean prop. When true, apply framer-motion `x` oscillation (`[0, -6, 6, -4, 4, 0]`) over 400ms.

### `src/components/Game.tsx`
- Install and import `canvas-confetti`
- Import `useSoundFX` hook
- Add state: `flashTrigger`, `flashColor`, `damageTrigger`, `damageValue`, `damageSide`, `shakingQ`, `shakingP`, `showComebackEntrance`
- Wire effects at each game event:

| Game Event | Sound | Visual |
|---|---|---|
| Buzzer pressed | `playBuzzer(player)` | `ScreenFlash` in player color |
| Correct (first) | `playCorrect()` + streak sound | Confeti + green flash + floating damage |
| Correct (second chance) | `playCorrect()` | Confeti + green flash + floating half-damage |
| Wrong answer | `playWrong()` | Red flash + option grid shake |
| Damage received | `playDamage()` | HealthBar shake on damaged player |
| Streak ≥ 3 | `playStreakHit(streak)` | Multiplier badge pulses |
| Comeback activates | `playComebackActivate()` | `ComebackEntrance` overlay |
| Comeback tick | `playComebackTick(n)` | Gold flash + dot glow |
| Comeback success | `playComebackSuccess()` | Full confetti + gold flash |
| Comeback fail | `playComebackFail()` | Dark flash + game over fade |

### Streak multiplier badge
Enhance the existing 🔥 streak indicator in `HealthBar.tsx` to show the current multiplier value when streak ≥ 3 (e.g. `🔥×1.3`), with a pulsing glow animation.

## Dependencies

```
canvas-confetti + @types/canvas-confetti
```

## Scope Boundaries

- No changes to game logic (already done in prior session)
- No changes to exercise generation
- All effects are purely additive — removing them would not affect gameplay
