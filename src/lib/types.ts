export type Screen = 'home' | 'game' | 'scoreboard'

export type PlayerKey = 'q' | 'p'

export interface GameConfig {
  player1Name: string
  player2Name: string
  pointsToWin: number
  timerSeconds: number
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
