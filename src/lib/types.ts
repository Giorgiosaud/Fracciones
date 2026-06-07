export type Screen = 'home' | 'game' | 'soloGame' | 'scoreboard'

export type PlayerKey = 'q' | 'p'

export type GameMode = 'multiplayer' | 'solo'

export interface GameConfig {
  mode: GameMode
  player1Name: string
  player2Name: string
  pointsToWin: number
  timerSeconds: number
}

export interface SoloHighScore {
  bestStreak: number
  bestAccuracy: number   // percentage 0-100, only updated past a minimum sample size
  totalSessions: number
  updatedAt: string      // ISO date
}

export type ExerciseType = 'compare' | 'simplify' | 'amplify' | 'mixed'

export interface FractionValue {
  numerator: number
  denominator: number
}

export type ExerciseAnswer = string | number

export interface Exercise {
  type: ExerciseType
  fractionA: FractionValue
  fractionB?: FractionValue
  targetDenominator?: number
  wholePartA?: number
  answer: ExerciseAnswer
  displayAnswer: string
  options: string[]  // shuffled choices including the correct answer
}

export interface RoundResult {
  winner: PlayerKey | null
  correct: boolean
}

export interface Scores {
  q: number
  p: number
}
