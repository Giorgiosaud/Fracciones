import { useState } from 'react'
import Home from './components/Home'
import Game from './components/Game'
import SoloGame from './components/SoloGame'
import FinalScoreboard from './components/FinalScoreboard'
import type { GameConfig, PlayerKey, Screen, Scores } from './lib/types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<GameConfig>({ mode: 'multiplayer', player1Name: 'Jugador 1', player2Name: 'Jugador 2', pointsToWin: 10, timerSeconds: 20 })
  const [finalScores, setFinalScores] = useState<Scores>({ q: 0, p: 0 })
  const [winner, setWinner] = useState<PlayerKey>('q')

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg)
    setScreen(cfg.mode === 'solo' ? 'soloGame' : 'game')
  }

  const handleGameEnd = (scores: Scores, cfg: GameConfig, w: PlayerKey) => {
    setFinalScores(scores)
    setConfig(cfg)
    setWinner(w)
    setScreen('scoreboard')
  }

  const handleReplay = () => setScreen('home')

  if (screen === 'home') return <Home onStart={handleStart} />
  if (screen === 'game') return <Game config={config} onGameEnd={handleGameEnd} />
  if (screen === 'soloGame') return <SoloGame config={config} onExit={handleReplay} />
  return <FinalScoreboard scores={finalScores} config={config} winner={winner} onReplay={handleReplay} />
}
