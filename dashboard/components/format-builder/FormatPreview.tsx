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
import { TimerBlock } from '@/components/match/TimerBlock'

// Mock-data builders ─────────────────────────────────────────────────────────
import {
  getMockParticipants,
  getMockLiveState,
  buildMockFormat,
} from './previewMocks'

// ---------------------------------------------------------------------------
// Engine panel map
// ---------------------------------------------------------------------------

// eslint-disable-next-line
const ENGINE_PANELS: Record<EngineType, React.ComponentType<any>> = {
  finish_time:  FinishTimePanel,
  score_timed:  ScoreTimedPanel,
  score_sets:   ScoreSetsPanel,
  judge_scores: JudgeScoresPanel,
  manual_pick:  ManualPickPanel,
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
      {addOns.timer.enabled && (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm p-5">
          <TimerBlock
            liveState={liveState}
            mode={addOns.timer.mode as any}
            duration={addOns.timer.duration}
            onPatch={onPatch}
          />
        </div>
      )}
      {addOns.notes.enabled && <NotesPreview />}
    </div>
  )
}