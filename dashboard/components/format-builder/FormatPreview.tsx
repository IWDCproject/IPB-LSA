'use client'

import { useFormatBuilder } from '@/stores/formatBuilder'
import { ScoreTimedPreview } from './preview/ScoreTimedPreview'
import { ScoreSetsPreview } from './preview/ScoreSetsPreview'
import { JudgeScoresPreview } from './preview/JudgeScoresPreview'
import { FinishTimePreview } from './preview/FinishTimePreview'
import { ManualPickPreview } from './preview/ManualPickPreview'
import type { EngineType } from '@/types/directus'

// --- Timer mock ------------------------------------------------

function TimerPreview() {
  const { addOns } = useFormatBuilder()
  const { mode, duration } = addOns.timer

  const isStopwatch = mode === 'stopwatch'
  const modeLabel = mode === 'countdown' ? 'countdown' : mode === 'stopwatch' ? 'Stopwatch' : 'Deadline'

  const countdownDisplay = (() => {
    const m = Math.floor(duration / 60).toString().padStart(2, '0')
    const s = (duration % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })()

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">
          Timer <span className="font-normal text-zinc-500">({modeLabel})</span>
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold font-mono text-zinc-900">
            {isStopwatch ? '00:00:00' : countdownDisplay}
          </span>
          <div className="flex gap-1.5">
            {isStopwatch && (
              <button className="text-xs border border-zinc-300 rounded px-2 py-1 text-zinc-600">Flag</button>
            )}
            <button className="text-xs border border-zinc-300 rounded px-2 py-1 text-zinc-600">Reset</button>
            <button className="text-xs border border-zinc-300 rounded px-2 py-1 text-zinc-600">Start</button>
          </div>
        </div>
        {isStopwatch && (
          <div className="mt-3 space-y-0.5">
            <p className="text-xs text-zinc-400 tabular-nums">1. 00:00:00</p>
            <p className="text-xs text-zinc-400 tabular-nums">2. 00:00:00</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Notes mock ------------------------------------------------

function NotesPreview() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">Operator Notes</p>
      </div>
      <div className="p-4">
        <div className="h-24 rounded border border-zinc-200 bg-zinc-50" />
        <button className="w-full mt-3 py-1.5 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
          Save &amp; Broadcast
        </button>
      </div>
    </div>
  )
}

// --- Engine → preview component map ----------------------------

const ENGINE_PREVIEW: Record<EngineType, React.ComponentType> = {
  score_timed:  ScoreTimedPreview,
  score_sets:   ScoreSetsPreview,
  judge_scores: JudgeScoresPreview,
  finish_time:  FinishTimePreview,
  manual_pick:  ManualPickPreview,
}

// --- Komponen utama --------------------------------------------

export function FormatPreview() {
  const { engine, addOns } = useFormatBuilder()

  const PreviewComponent = ENGINE_PREVIEW[engine.type]

  return (
    <div className="space-y-3">
      <PreviewComponent />
      {addOns.timer.enabled && <TimerPreview />}
      {addOns.notes.enabled && <NotesPreview />}
    </div>
  )
}