'use client'

import { useState, useCallback, useEffect } from 'react'
import { useFormatBuilder } from '@/stores/formatBuilder'
import type { LiveState } from '@/types/directus'
import type { EngineType } from '@/types/directus'

// Real engine panels ─────────────────────────────────────────────────────────
import FinishTimePanel from '@/components/match/FinishTimePanel'
import ScoreTimedPanel from '@/components/match/ScoreTimedPanel'
import ScoreSetsPanel  from '@/components/match/ScoreSetsPanel'
import JudgeScoresPanel from '@/components/match/JudgeScoresPanel'
import ManualPickPanel from '@/components/match/ManualPickPanel'

// Mock-data builders ─────────────────────────────────────────────────────────
import {
  getMockParticipants,
  getMockLiveState,
  buildMockFormat,
} from './previewMocks'

// ---------------------------------------------------------------------------
// Engine panel map
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENGINE_PANELS: Record<EngineType, React.ComponentType<any>> = {
  finish_time:  FinishTimePanel,
  score_timed:  ScoreTimedPanel,
  score_sets:   ScoreSetsPanel,
  judge_scores: JudgeScoresPanel,
  manual_pick:  ManualPickPanel,
}

// ---------------------------------------------------------------------------
// Timer preview (kept as a local mock — TimerBlock needs a real socket)
// ---------------------------------------------------------------------------

function TimerPreview() {
  const { addOns } = useFormatBuilder()
  const { mode, duration } = addOns.timer

  const isStopwatch  = mode === 'stopwatch'
  const modeLabel    = mode === 'countdown' ? 'Countdown'
                     : mode === 'stopwatch' ? 'Stopwatch'
                     : 'Deadline'

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

// ---------------------------------------------------------------------------
// Notes preview (kept as a local mock — OperatorNotes needs a real socket)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FormatPreview — main export
// ---------------------------------------------------------------------------

export function FormatPreview() {
  const { engine, matchType, addOns } = useFormatBuilder()

  // Local liveState makes the real panel fully interactable in preview mode.
  const [liveState, setLiveState] = useState<LiveState>(getMockLiveState)

  // Reset state whenever the engine type switches so stale data from a
  // previous engine type doesn't appear in the new one's panel.
  useEffect(() => {
    setLiveState(getMockLiveState())
  }, [engine.type])

  // Mirrors the real onPatch signature — merges partial updates into local state.
  const onPatch = useCallback(async (partial: Partial<LiveState>) => {
    setLiveState((prev) => ({ ...prev, ...partial }))
  }, [])

  const format       = buildMockFormat(engine, matchType)
  const participants = getMockParticipants(matchType)
  const Panel        = ENGINE_PANELS[engine.type]

  return (
    <div className="space-y-3">
      <Panel
        liveState={liveState}
        onPatch={onPatch}
        format={format}
        participants={participants}
        homeParticipant={participants[0] ?? null}
        awayParticipant={participants[1] ?? null}
      />
      {addOns.timer.enabled && <TimerPreview />}
      {addOns.notes.enabled && <NotesPreview />}
    </div>
  )
}