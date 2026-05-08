'use client'

import { useState } from 'react'
import type { EnginePanelProps } from './types'

export default function JudgeScoresPanel({ liveState, onPatch, format }: EnginePanelProps) {
  const cfg = (format.modules[0] as { type: 'judge_scores'; config: {
    num_judges: number; score_min: number; score_max: number; step: number; method: string
  }}).config

  const { numJudges, scoreMin, scoreMax, step, method } = {
    numJudges: cfg.num_judges,
    scoreMin:  cfg.score_min,
    scoreMax:  cfg.score_max,
    step:      cfg.step,
    method:    cfg.method,
  }

  const [drafts, setDrafts] = useState<(number | '')[]>(
    () => Array.from({ length: numJudges }, (_, i) => liveState.judgeScores[i] ?? '')
  )

  function setDraft(i: number, val: string) {
    const parsed = parseFloat(val)
    const next   = [...drafts]
    if (val === '') {
      next[i] = ''
    } else {
      next[i] = isNaN(parsed) ? '' : Math.min(scoreMax, Math.max(scoreMin, parsed))
    }
    setDrafts(next)
  }

  function calcAverage(scores: number[]): number {
    if (scores.length === 0) return 0
    if (method === 'drop_extremes' && scores.length >= 3) {
      const sorted = [...scores].sort((a, b) => a - b)
      const trimmed = sorted.slice(1, -1)
      return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
    }
    const sum = scores.reduce((a, b) => a + b, 0)
    return method === 'avg' ? sum / scores.length : sum
  }

  const filledScores = drafts.filter((d): d is number => d !== '')
  const allFilled    = filledScores.length === numJudges
  const average      = allFilled ? calcAverage(filledScores) : null

  async function handleRecord() {
    if (!allFilled) return
    const scores = drafts as number[]
    await onPatch({ judgeScores: scores })
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Judge Panel</p>
        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
          {numJudges} Judges
        </span>
      </div>

      <div className="p-6">
        {/* Judge boxes — Now wider (w-20) and bigger text */}
        <div className="flex gap-3 justify-center flex-wrap">
          {Array.from({ length: numJudges }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Juri {i + 1}</span>
              <input
                type="number"
                min={scoreMin}
                max={scoreMax}
                step={step}
                value={drafts[i] === '' ? '' : String(drafts[i])}
                onChange={(e) => setDraft(i, e.target.value)}
                className="w-20 h-20 text-center text-4xl font-[800] text-zinc-900 border-2 border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 p-0 transition-all bg-zinc-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              />
            </div>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-100">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-400 font-bold leading-none mb-1">
              {method === 'avg' ? 'Average' : method === 'sum' ? 'Sum' : 'Trimmed avg'}
            </span>
            <span className="text-2xl font-bold text-zinc-900 tabular-nums">
              {average !== null ? average.toFixed(2) : '–'}
            </span>
          </div>
          
          <button
            disabled={!allFilled}
            onClick={handleRecord}
            className="h-12 px-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md transition-colors disabled:opacity-30 font-bold text-sm shadow-sm active:scale-95 transform"
          >
            Record &amp; Finish
          </button>
        </div>
      </div>
    </div>
  )
}