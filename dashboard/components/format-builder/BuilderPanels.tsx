'use client'

import { useState } from 'react'
import { useFormatBuilder } from '@/stores/formatBuilder'
import { ScoreTimedConfig }   from './engines/ScoreTimedConfig'
import { ScoreSetsConfig }    from './engines/ScoreSetsConfig'
import { JudgeScoresConfig }  from './engines/JudgeScoresConfig'
import { FinishTimeConfig, ManualPickConfig } from './engines/FinishTimeAndManualPickConfig'
import { PresetModal } from './PresetModal' 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import type { MatchType, EngineType, TimerMode } from '@/types/directus'

// --- Static data -------------------------------------------------------------

const MATCH_TYPE_OPTIONS: {
  value: MatchType
  label: string
  description: string
}[] =[
  { value: 'head_to_head', label: 'Head to Head', description: 'dua sisi, a vs b' },
  { value: 'solo',         label: 'Solo',         description: 'satu participant per match' },
  { value: 'open',         label: 'Open',         description: 'semua partisipan satu match' },
]

const ENGINE_OPTIONS: {
  value: EngineType
  label: string
  description: string
  matchTypes: MatchType[]
}[] =[
  {
    value: 'score_timed',
    label: 'Accumulating Score',
    description: 'futsal, basket, silat, taekwondo...',
    matchTypes: ['head_to_head'],
  },
  {
    value: 'score_sets',
    label: 'Set-Based',
    description: 'badminton, voli, tenis, takraw...',
    matchTypes:['head_to_head'],
  },
  {
    value: 'judge_scores',
    label: 'Judge Panel',
    description: 'gymnastics, solo vokal, tari...',
    matchTypes:['solo'],
  },
  {
    value: 'finish_time',
    label: 'Finish Time',
    description: 'lari, marathon, renang, cycling...',
    matchTypes:['solo', 'open'],
  },
  {
    value: 'manual_pick',
    label: 'Manual Pick',
    description: 'hackathon, debat, catur, dll...',
    matchTypes:['head_to_head', 'open'],
  },
]

const ENGINE_INFO: Record<EngineType, { title: string; body: string }> = {
  score_timed: {
    title: 'Accumulating Score',
    body: 'Score goes up throughout the match. Win by reaching a threshold (kumite: first to 8) or by highest score when time ends (futsal, basket). Optional time periods where score carries over.',
  },
  score_sets: {
    title: 'Set-Based',
    body: 'Score resets to 0–0 at the start of each set. Win a set, accumulate set wins. First to win N sets takes the match. Each set has its own finish.',
  },
  judge_scores: {
    title: 'Judge Panel',
    body: 'Multiple judges each give a numeric score. Result computed by average, sum, or dropping the highest and lowest (drop-extremes).',
  },
  finish_time: {
    title: 'Finish Time',
    body: 'Record a finish time for each participant. Rank by fastest (races) or latest (rare - e.g. endurance hold).',
  },
  manual_pick: {
    title: 'Manual Pick',
    body: 'No scoring at all. Operator manually declares the winner when the event concludes. Use when the result isn\'t a number.',
  },
}

const TIMER_MODE_LABEL: Record<TimerMode, string> = {
  countdown: 'Countdown',
  stopwatch: 'Stopwatch',
  deadline:  'Deadline (target waktu)',
}

const ENGINE_CONFIG_COMPONENT: Record<EngineType, React.ComponentType> = {
  score_timed:  ScoreTimedConfig,
  score_sets:   ScoreSetsConfig,
  judge_scores: JudgeScoresConfig,
  finish_time:  FinishTimeConfig,
  manual_pick:  ManualPickConfig,
}

// --- Left Sidebar -------------------------------------------------------------

export function LeftSidebar() {
  const { matchType, setMatchType, engine, setEngine, addOns, setAddOn } = useFormatBuilder()
  const [showPresets, setShowPresets] = useState(false)

  const availableEngines = ENGINE_OPTIONS.filter((e) =>
    e.matchTypes.includes(matchType)
  )

  return (
    <>
      <div className="p-3 space-y-5">
        {/* Start From Preset */}
        <button
          onClick={() => setShowPresets(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-sm border border-zinc-700 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
        >
          Start From Preset
          <span className="text-zinc-400">›</span>
        </button>

        {/* Match Type */}
        <section>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1 text-center">
            Match Type
          </p>
          <div className="space-y-1">
            {MATCH_TYPE_OPTIONS.map((opt) => {
              const active = matchType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMatchType(opt.value)}
                  className={[
                    'w-full text-left px-3 py-2 rounded-sm border transition-colors',
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-900  hover:bg-zinc-200',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                  <p className={['text-[11px] mt-0', active ? 'text-zinc-400' : 'text-zinc-500'].join(' ')}>
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Scoring Engine */}
        <section>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mt-10 mb-1 px-1 text-center">
            Scoring Engine
          </p>
          <p className="text-[11px] text-zinc-400 px-1 mb-4 leading-relaxed text-center">
            This determines how the match is scored and how a winner is decided.
          </p>
          <div className="space-y-1">
            {availableEngines.map((opt) => {
              const active = engine.type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEngine({ type: opt.value })}
                  className={[
                    'w-full text-left px-3 py-2 rounded-sm border transition-colors',
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-900  hover:bg-zinc-200',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                  <p className={['text-[11px] mt-0', active ? 'text-zinc-400' : 'text-zinc-500'].join(' ')}>
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Add-ons */}
        <section>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1 text-center mt-8">
            Add-on
          </p>
          <div className="space-y-1">
            {/* Timer */}
            <button
              type="button"
              onClick={() => setAddOn('timer', { enabled: !addOns.timer.enabled })}
              className={[
                'w-full text-left px-3 py-2 rounded-sm border transition-colors',
                addOns.timer.enabled
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-900  hover:bg-zinc-200',
              ].join(' ')}
            >
              <p className="text-sm font-semibold leading-tight">Timer</p>
              <p className={['text-[11px] mt-0', addOns.timer.enabled ? 'text-zinc-400' : 'text-zinc-500'].join(' ')}>
                count down/up
              </p>
            </button>

            {/* Notes */}
            <button
              type="button"
              onClick={() => setAddOn('notes', { enabled: !addOns.notes.enabled })}
              className={[
                'w-full text-left px-3 py-2 rounded-sm border transition-colors',
                addOns.notes.enabled
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-900  hover:bg-zinc-200',
              ].join(' ')}
            >
              <p className="text-sm font-semibold leading-tight">Notes</p>
              <p className={['text-[11px] mt-0', addOns.notes.enabled ? 'text-zinc-400' : 'text-zinc-500'].join(' ')}>
                catatan operator
              </p>
            </button>
          </div>
        </section>
      </div>

      <PresetModal isOpen={showPresets} onClose={() => setShowPresets(false)} />
    </>
  )
}

// --- Center Config Panel -----------------------------------------------------

export function CenterConfigPanel() {
  const { engine, addOns, setAddOn } = useFormatBuilder()

  const info = ENGINE_INFO[engine.type]
  const EngineConfig = ENGINE_CONFIG_COMPONENT[engine.type]

  return (
    <div className="p-8 max-w-2xl space-y-8">

      {/* Engine config section */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900">{info.title}</h2>
        <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{info.body}</p>

        <div className="mt-6">
          <EngineConfig />
        </div>
      </section>

      {/* Timer add-on config (shown inline when enabled) */}
      {addOns.timer.enabled && (
        <section>
          <div className="border-t border-zinc-200 pt-8">
            <h2 className="text-lg font-bold text-zinc-900">Timer</h2>
            <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
              Per-period countdown or stopwatch
            </p>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Counting Direction</Label>
                <Select
                  value={addOns.timer.mode}
                  onValueChange={(val) => setAddOn('timer', { mode: val as TimerMode })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIMER_MODE_LABEL) as TimerMode[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {TIMER_MODE_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {addOns.timer.mode !== 'deadline' && (
                <div className="space-y-1.5">
                  <Label>Duration in seconds</Label>
                  <Input
                    type="number"
                    min={1}
                    className="max-w-xs"
                    value={addOns.timer.duration}
                    onChange={(e) => setAddOn('timer', { duration: Number(e.target.value) })}
                  />
                  {addOns.timer.duration > 0 && (
                    <p className="text-xs text-zinc-400">
                      {Math.floor(addOns.timer.duration / 60)}m {addOns.timer.duration % 60}s
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Notes add-on config (no settings needed) */}
      {addOns.notes.enabled && (
        <section>
          <div className="border-t border-zinc-200 pt-8">
            <h2 className="text-lg font-bold text-zinc-900">Notes</h2>
            <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
              No config needed. Operator writes notes during the match and can broadcast them to the display.
            </p>
          </div>
        </section>
      )}

    </div>
  )
}