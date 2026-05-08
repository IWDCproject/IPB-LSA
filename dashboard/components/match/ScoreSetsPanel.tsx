'use client'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { EnginePanelProps, SetLogEntry } from './types'

export default function ScoreSetsPanel({ liveState, onPatch, format }: EnginePanelProps) {
  const cfg = (format.modules[0] as { type: 'score_sets'; config: {
    score_label: string; term: string; max_sets: number; sets_to_win: number
  }}).config

  const { setIdx, setPhase, setScore, setsWon, setLog } = liveState
  const setTerm  = cfg.term        ?? 'Set'
  const maxSets  = cfg.max_sets    ?? 3
  const toWin    = cfg.sets_to_win ?? 2

  async function adjustSetScore(side: 'home' | 'away', delta: number) {
    const idx  = side === 'home' ? 0 : 1
    const next = [...setScore] as [number, number]
    next[idx]  = Math.max(0, next[idx] + delta)
    await onPatch({ setScore: next })
  }

  async function startSet() {
    await onPatch({ setPhase: 'active' })
  }

  async function confirmSetWinner(side: 'home' | 'away') {
    const newSetsWon = [...setsWon] as [number, number]
    newSetsWon[side === 'home' ? 0 : 1] += 1

    const entry: SetLogEntry = {
      set:       setIdx + 1,
      homeScore: setScore[0],
      awayScore: setScore[1],
      winner:    side,
    }

    const newSetLog: SetLogEntry[] = [...(setLog ?? []), entry]

    await onPatch({
      setsWon:          newSetsWon,
      setLog:           newSetLog,
      setIdx:           setIdx + 1,
      setPhase:         'idle',
      setScore:[0, 0],
      pendingSetWinner: null,
    })
  }

  async function reopenSet(n: number) {
    const trimmedLog: SetLogEntry[] = (setLog ??[]).slice(0, n - 1)
    const newSetsWon = trimmedLog.reduce<[number, number]>(
      (acc, entry) => {
        acc[entry.winner === 'home' ? 0 : 1] += 1
        return acc
      },
      [0, 0]
    )
    await onPatch({
      setIdx:   n - 1,
      setPhase: 'idle',
      setScore: [0, 0],
      setsWon:  newSetsWon,
      setLog:   trimmedLog,
    })
  }

  const logRows = Array.from({ length: maxSets }, (_, i) => {
    const entry: SetLogEntry | undefined = (setLog ?? [])[i]
    return { n: i + 1, entry }
  })

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">{cfg.score_label || 'Set Based Scores'}</p>
        <span className="text-xs text-zinc-500">
          {setTerm} {setIdx + 1}/{maxSets}
          <span className="ml-1.5 text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">{setPhase}</span>
        </span>
      </div>

      {/* period bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50">
        <WinDots won={setsWon[0]} needed={toWin} label="Home" />
        {setPhase === 'idle' ? (
          <button
            onClick={startSet}
            className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Start {setTerm} {setIdx + 1}
          </button>
        ) : (
          <div className="flex gap-1.5">
            <ConfirmDialog
              trigger={
                <button className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 transition-colors">
                  Home wins set
                </button>
              }
              title="Confirm set winner"
              description={`Mark Home as the winner of ${setTerm} ${setIdx + 1}?`}
              confirmLabel="Confirm"
              variant="filled"
              onConfirm={() => confirmSetWinner('home')}
            />
            <ConfirmDialog
              trigger={
                <button className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 transition-colors">
                  Away wins set
                </button>
              }
              title="Confirm set winner"
              description={`Mark Away as the winner of ${setTerm} ${setIdx + 1}?`}
              confirmLabel="Confirm"
              variant="filled"
              onConfirm={() => confirmSetWinner('away')}
            />
          </div>
        )}
        <WinDots won={setsWon[1]} needed={toWin} label="Away" />
      </div>

      {/* skor per set */}
      <div className="grid grid-cols-[1fr_auto_1fr] p-5">
        <ScoreColumn
          label="Home"
          score={setScore[0]}
          onPlus={() => adjustSetScore('home', 1)}
          onMinus={() => adjustSetScore('home', -1)}
        />
        <div className="flex items-center justify-center px-4">
          <span className="text-xl font-bold text-zinc-300">VS</span>
        </div>
        <ScoreColumn
          label="Away"
          score={setScore[1]}
          onPlus={() => adjustSetScore('away', 1)}
          onMinus={() => adjustSetScore('away', -1)}
        />
      </div>

      {/* set history */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Set History</p>
        <div className="space-y-1">
          {logRows.map(({ n, entry }) => (
            <div key={n} className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">{setTerm} #{n}</span>
              <span className="text-zinc-400 tabular-nums">
                {entry ? `${entry.homeScore}–${entry.awayScore}` : '–'}
              </span>
              {entry && (
                <ConfirmDialog
                  trigger={
                    <button className="text-zinc-400 hover:text-zinc-700 transition-colors">
                      Reopen
                    </button>
                  }
                  title={`Reopen ${setTerm} ${n}?`}
                  description={`This will discard all results after ${setTerm} ${n}. This cannot be undone.`}
                  confirmLabel="Reopen"
                  variant="destructive"
                  onConfirm={() => reopenSet(n)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Komponen kecil --------------------------------------------

function ScoreColumn({
  label, score, onPlus, onMinus,
}: { label: string; score: number; onPlus: () => void; onMinus: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <button 
        onClick={onPlus} 
        className="w-24 h-9 rounded bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-700 transition-colors"
      >
        +
      </button>
      <div className="w-24 h-24 border-2 border-zinc-300 rounded flex items-center justify-center bg-zinc-50">
        <span
          className="text-6xl text-zinc-900 font-[800] tabular-nums leading-none tracking-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {String(score).padStart(2, '0')}
        </span>
      </div>
      <button
        onClick={onMinus}
        disabled={score <= 0}
        className="w-24 h-9 rounded bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-700 transition-colors disabled:opacity-30"
      >
        −
      </button>
    </div>
  )
}

function WinDots({ won, needed, label }: { won: number; needed: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: needed }).map((_, i) => (
          <span key={i} className={`text-sm leading-none ${i < won ? 'text-zinc-900' : 'text-zinc-300'}`}>
            {i < won ? '●' : '○'}
          </span>
        ))}
      </div>
    </div>
  )
}