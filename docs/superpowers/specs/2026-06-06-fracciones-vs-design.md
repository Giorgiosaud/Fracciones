# Fracciones VS — Design Spec
**Date:** 2026-06-06
**Audience:** 2 kids, ~10 years old, same device/keyboard

---

## Overview

A single-page web app where two kids compete to answer fraction exercises as fast as possible. Player 1 uses the **Q** key as their buzzer, Player 2 uses **P**. The first to press their key locks in their turn and has 10 seconds to answer. First to N points wins.

---

## Stack

| Layer | Choice |
|-------|--------|
| Bundler | Vite |
| UI | React + TypeScript |
| Styles | Tailwind CSS |
| Fraction logic | `fraction.js` |
| Fraction visualization | Custom SVG (circle + bar) |
| Animations | Framer Motion |
| Deploy | Cloudflare Pages (`dist/`) |

---

## Screens

### 1. Home
- Input fields for Player 1 name (left) and Player 2 name (right)
- Points-to-win selector (5, 10, 15)
- "¡Jugar!" button to start
- Show keyboard shortcut reminder: Q vs P

### 2. Game
- Header: scores for both players (P1 left, P2 right) + round number
- Center: the fraction exercise rendered clearly
- Fraction visualizer: SVG circle and bar below the exercise
- Two large key indicators on screen: **[Q]** and **[P]** pulsing to indicate "waiting for buzz"
- When a player buzzes: their side highlights, countdown timer appears (10s)
- Answer input appears on the buzzing player's side
- Submit with Enter key

### 3. Round Result
- Animated feedback: ✓ correct / ✗ incorrect
- Show the correct answer with fraction visualizer
- Brief pause (2s) then next round

### 4. Final Scoreboard
- Winner announcement with confetti animation
- Final scores
- "Jugar de nuevo" button

---

## Exercise Types

All exercises are generated randomly. Difficulty scales gently over the first 3 rounds (simpler denominators early).

| Type | Description | Example |
|------|-------------|---------|
| Comparar | Choose >, <, or = between two fractions | 3/4 ___ 2/3 |
| Simplificar | Reduce fraction to lowest terms | 6/8 → ? |
| Amplificar | Scale fraction to target denominator | 1/3 = ?/9 |
| Fracción mixta | Convert improper ↔ mixed | 7/4 = 1 y 3/4 |

Fractions are generated with denominators 2–12. Mixed fractions use whole parts 1–3.

---

## Buzzer Mechanic

1. Exercise appears — both **Q** and **P** indicators pulse
2. First player to press their key locks the round
3. Locked player's side highlights; input field appears for their answer
4. **10-second countdown** — if time runs out: 0 points, other player gets a free-answer chance (5s)
5. If locked player answers wrong: other player gets a free-answer chance (5s)
6. Correct answer → +1 point to scorer

---

## Fraction Visualizer (SVG)

Two representations shown simultaneously:

**Circle (pizza):** SVG `<path>` draws filled sectors. N equal sectors, numerator sectors filled. Handles mixed fractions by showing multiple circles.

**Bar:** SVG `<rect>` elements side by side. N cells total, numerator cells filled.

Both update instantly when the exercise renders. Used also on the result screen to show the correct answer.

---

## Fraction Logic (`fraction.js`)

- Comparison: `new Fraction(a,b).compare(new Fraction(c,d))`
- Simplification: `new Fraction(a,b).toFraction()` gives reduced form
- MCD for amplification exercises
- Avoids all floating-point errors

---

## Data Flow

```
generateExercise() → Exercise object
     ↓
Game screen renders exercise + visualizer
     ↓
Keydown listener (Q / P) → locks player
     ↓
Player inputs answer → validateAnswer(exercise, input)
     ↓
roundResult(correct, player) → update scores
     ↓
if score >= pointsToWin → navigate to FinalScoreboard
else → generateExercise()
```

All state managed in a single `useGameStore` (Zustand or useState+useReducer). No backend, no persistence.

---

## File Structure

```
src/
  components/
    Home.tsx
    Game.tsx
    RoundResult.tsx
    FinalScoreboard.tsx
    FractionVisualizer.tsx   ← SVG circle + bar
    BuzzerIndicator.tsx      ← Q / P key display
    Timer.tsx
  lib/
    exercises.ts             ← exercise generator
    fractions.ts             ← fraction.js wrappers + validators
  App.tsx
  main.tsx
```

---

## Cloudflare Pages Deploy

- `npm run build` → `dist/`
- Connect GitHub repo to Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- No environment variables needed (fully client-side)
