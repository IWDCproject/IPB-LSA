'use client'

import type { EnginePanelProps } from './types'

// --- Komponen utama --------------------------------------------

export default function ScoreTimedPanel({ liveState, onPatch, format }: EnginePanelProps) {
  const cfg = (format.modules[0] as { type: 'score_timed'; config: {
    score_label: string; has_periods: boolean; period_term?: string; period_count?: number
  }}).config

  const {
    homeScore   = 0,
    awayScore   = 0,
    periodIdx   = 0,
    periodPhase = 'idle',
  } = liveState

  const periodTerm  = cfg.period_term  ?? 'Period'
  const periodCount = cfg.period_count ?? 1
  const hasPeriods  = cfg.has_periods

  const isLastPeriodDone =
    hasPeriods &&
    periodPhase === 'halftime' &&
    (periodIdx + 1) >= periodCount

  async function adjustScore(side: 'home' | 'away', delta: number) {
    const key = side === 'home' ? 'homeScore' : 'awayScore'
    const cur = side === 'home' ? homeScore   : awayScore
    await onPatch({ [key]: Math.max(0, cur + delta) })
  }

  async function startPeriod() {
    if (periodPhase === 'halftime') {
      await onPatch({ periodPhase: 'active', periodIdx: periodIdx + 1 })
    } else {
      await onPatch({ periodPhase: 'active' })
    }
  }

  async function endPeriod() {
    await onPatch({ periodPhase: 'halftime' })
  }

  const nextPeriodDisplay = periodIdx + 2

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">{cfg.score_label || 'Score'}</p>
        {hasPeriods && (
          <span className="text-xs text-zinc-500">
            {periodTerm} {periodIdx + 1}/{periodCount}
            <span className="ml-1.5 text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
              {periodPhase}
            </span>
          </span>
        )}
      </div>

      {hasPeriods && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50">
          <span className="text-xs text-zinc-600">
            {periodTerm} {periodIdx + 1}
          </span>

          {periodPhase === 'active' ? (
            <button
              onClick={endPeriod}
              className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              End {periodTerm}
            </button>
          ) : isLastPeriodDone ? (
            <span className="text-xs text-zinc-400 italic">All periods done</span>
          ) : (
            <button
              onClick={startPeriod}
              className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Start {periodTerm} {periodPhase === 'halftime' ? nextPeriodDisplay : periodIdx + 1}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] p-5">
        <ScoreColumn
          label="Home"
          score={homeScore}
          onPlus={() => adjustScore('home', 1)}
          onMinus={() => adjustScore('home', -1)}
          disabled={isLastPeriodDone}
        />
        <div className="flex items-center justify-center px-4">
          <span className="text-xl font-bold text-zinc-300">VS</span>
        </div>
        <ScoreColumn
          label="Away"
          score={awayScore}
          onPlus={() => adjustScore('away', 1)}
          onMinus={() => adjustScore('away', -1)}
          disabled={isLastPeriodDone}
        />
      </div>
    </div>
  )
}

// --- Komponen kecil --------------------------------------------

function ScoreColumn({
  label, score, onPlus, onMinus, disabled,
}: { label: string; score: number; onPlus: () => void; onMinus: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>

      <button
        onClick={onPlus}
        disabled={disabled}
        className="w-24 h-9 rounded bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-700 transition-colors disabled:opacity-30"
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
        disabled={disabled || score <= 0}
        className="w-24 h-9 rounded bg-zinc-900 text-white text-xl font-bold hover:bg-zinc-700 transition-colors disabled:opacity-30"
      >
        −
      </button>
    </div>
  )
}