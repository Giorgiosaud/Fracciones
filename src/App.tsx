import { useState } from 'react'
import Home from './components/Home'
import type { GameConfig, Screen } from './lib/types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<GameConfig | null>(null)

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg)
    setScreen('game')
  }

  if (screen === 'home') return <Home onStart={handleStart} />
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      Jugando como {config?.player1Name} vs {config?.player2Name}...
    </div>
  )
}
