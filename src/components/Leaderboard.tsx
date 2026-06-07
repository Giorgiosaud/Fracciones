import { useEffect, useState } from 'react'
import { fetchTop } from '../lib/leaderboardApi'
import type { LeaderboardEntry } from '../lib/types'

type Status = 'loading' | 'ready' | 'error' | 'empty'

interface Props {
  questionLimit: number
  limit?: number
}

export default function Leaderboard({ questionLimit, limit = 10 }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetchTop(questionLimit, limit).then((result) => {
      if (cancelled) return
      if (result === null) setStatus('error')
      else if (result.length === 0) setStatus('empty')
      else {
        setEntries(result)
        setStatus('ready')
      }
    })
    return () => { cancelled = true }
  }, [questionLimit, limit])

  return (
    <div className="w-full max-w-xs mx-auto">
      <p className="font-display text-base text-[#FFD700] tracking-widest mb-2 text-center">
        TABLA · PARTIDAS DE {questionLimit}
      </p>
      {status === 'loading' && <p className="text-white/50 text-sm text-center">Cargando...</p>}
      {status === 'error' && <p className="text-white/50 text-sm text-center">No se pudo cargar la tabla.</p>}
      {status === 'empty' && <p className="text-white/50 text-sm text-center">¡Sé el primero en aparecer aquí!</p>}
      {status === 'ready' && (
        <ol className="flex flex-col gap-1">
          {entries.map((entry, i) => (
            <li key={entry.name} className="flex items-center justify-between text-sm text-white bg-[#16162A] rounded-lg px-3 py-1.5">
              <span className="flex items-center gap-2">
                <span className="text-white/40 w-4 text-right">{i + 1}</span>
                <span className="font-bold">{entry.name}</span>
              </span>
              <span className="text-[#FFD700]">{entry.bestScore} pts <span className="text-white/40">· {entry.bestStreak} 🔥</span></span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
