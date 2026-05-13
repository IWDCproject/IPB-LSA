'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EnginePanelProps } from './types'
import type { Participant, TimeLogEntry } from '@/types/directus'

// --- Types ---------------------------------------------------

type Props = EnginePanelProps & { participants: Participant[] }

// --- Helpers -------------------------------------------------

function parseTimeStr(t: string): number {
  const d = parseInt(t.match(/(\d+)d/)?.[1] ?? '0', 10)
  const m = parseInt(t.match(/(\d+)m/)?.[1] ?? '0', 10)
  const s = parseInt(t.match(/(\d+)s/)?.[1] ?? '0', 10)
  const ms = parseInt(t.match(/(\d+)ms/)?.[1] ?? '0', 10)
  return d * 86400000 + m * 60000 + s * 1000 + ms
}

// --- Component -----------------------------------------------

export default function FinishTimePanel({ liveState, onPatch, format, participants }: Props) {
  const cfg = (format.modules[0] as {
    type: 'finish_time'
    config: { unit: 's' | 'ms'; rank_order: 'asc' | 'desc' }
  }).config

  const showMs = cfg.unit === 'ms'
  const rankAsc = cfg.rank_order === 'asc'
  const isSolo = participants.length === 1

  const [selectedId, setSelectedId] = useState('')
  const [days, setDays] = useState('')
  const [mins, setMins] = useState('')
  const [secs, setSecs] = useState('')
  const [ms, setMs] = useState('')

  // FIX: use participant.id as the canonical set key, falling back to name for
  // legacy rows. Using both caused ambiguity when a participant's name happened
  // to equal another participant's id (unlikely but possible in test data).
  const loggedIds = new Set<string>(
    liveState.timeLog.map((e: TimeLogEntry) => e.id ?? e.name)
  )
  const pending = participants.filter((p) => !loggedIds.has(p.id) && !loggedIds.has(p.name))
  const allDone = pending.length === 0 && participants.length > 0

  function buildSortedLog(log: TimeLogEntry[]) {
    return [...log].sort((a, b) => {
      const d = parseTimeStr(a.time) - parseTimeStr(b.time)
      return rankAsc ? d : -d
    })
  }

  function buildRankings(log: TimeLogEntry[]) {
    return buildSortedLog(log).map((e, i) => ({
      rank: i + 1,
      id: e.id ?? e.name,
      name: e.name,
    }))
  }

  async function handleRecord() {
    const participant = isSolo
      ? participants[0]
      : participants.find((p) => p.id === selectedId)
    if (!participant) return

    const d_ = parseInt(days || '0', 10)
    const m_ = parseInt(mins || '0', 10)
    const s_ = parseInt(secs || '0', 10)
    const ms_ = parseInt(ms || '0', 10)

    const totalMs = d_ * 86400000 + m_ * 60000 + s_ * 1000 + ms_
    if (totalMs <= 0) return

    const timeStr = [
      d_ > 0 && `${d_}d`,
      m_ > 0 && `${m_}m`,
      s_ > 0 && `${s_}s`,
      showMs && ms_ > 0 && `${ms_}ms`,
    ].filter(Boolean).join(' ') || (showMs ? '0ms' : '0s')

    const rawLog = [
      ...liveState.timeLog,
      { id: participant.id, name: participant.name, time: timeStr },
    ]

    // Recalculate ranks for all entries to ensure consistency
    const sorted = buildSortedLog(rawLog)
    const newLog: TimeLogEntry[] = rawLog.map(entry => {
      const rank = sorted.findIndex(s => (s.id ?? s.name) === (entry.id ?? entry.name)) + 1
      return { ...entry, rank }
    })

    await onPatch({ timeLog: newLog, rankings: buildRankings(newLog) })

    setSelectedId('')
    setDays(''); setMins(''); setSecs(''); setMs('')
  }

  async function handleRemove(id: string) {
    const filteredLog = liveState.timeLog.filter(
      (e: TimeLogEntry) => e.id !== id && e.name !== id
    )

    // Recalculate ranks for the remaining entries
    const sorted = buildSortedLog(filteredLog)
    const newLog: TimeLogEntry[] = filteredLog.map(entry => {
      const rank = sorted.findIndex(s => (s.id ?? s.name) === (entry.id ?? entry.name)) + 1
      return { ...entry, rank }
    })

    await onPatch({ timeLog: newLog, rankings: buildRankings(newLog) })
  }

  // FIX: disallow Record when time is 0 across all fields even if fields are filled,
  // in addition to the existing participant + at-least-one-field check.
  const totalMsValue =
    parseInt(days || '0', 10) * 86400000 +
    parseInt(mins || '0', 10) * 60000 +
    parseInt(secs || '0', 10) * 1000 +
    (showMs ? parseInt(ms || '0', 10) : 0)
  const canRecord =
    (isSolo || selectedId) &&
    (days || mins || secs || (showMs && ms)) &&
    totalMsValue > 0

  const sortedLog = buildSortedLog(liveState.timeLog)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Finish Times</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{rankAsc ? 'fastest first' : 'slowest first'}</span>
          <span className="text-xs bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full">
            {allDone ? 'All recorded' : `${pending.length} pending`}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* -- Input row -- */}
        {!allDone && (
          <div className="flex items-center gap-2">
            {!isSolo && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="!h-10 rounded-lg min-w-0 flex-[2] text-sm">
                  <SelectValue placeholder="Select participant…" />
                </SelectTrigger>
                <SelectContent>
                  {pending.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <TimeInput value={days} onChange={setDays} placeholder="0" suffix="d" max={2} />
            <TimeInput value={mins} onChange={setMins} placeholder="0" suffix="m" max={3} />
            <TimeInput value={secs} onChange={setSecs} placeholder="00" suffix="s" max={2} />
            {showMs && (
              <TimeInput value={ms} onChange={setMs} placeholder="000" suffix="ms" max={3} />
            )}

            <Button
              disabled={!canRecord}
              onClick={handleRecord}
              className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm shrink-0 rounded-lg"
            >
              Record
            </Button>
          </div>
        )}

        {/* -- Results list -- */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Results - {sortedLog.length} / {participants.length}
          </p>

          {sortedLog.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-200 rounded-lg text-zinc-400">
              <p className="text-sm">No times recorded yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedLog.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <span className="text-xs font-bold w-5 tabular-nums shrink-0 text-zinc-400">
                    #{i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{r.name}</span>
                  <span className="tabular-nums text-sm text-zinc-500 shrink-0">{r.time}</span>
                  <button
                    onClick={() => handleRemove(r.id ?? r.name)}
                    title="Remove"
                    className="w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// --- Sub-components ------------------------------------------

function TimeInput({
  value, onChange, placeholder, suffix, max,
}: {
  value: string; onChange: (v: string) => void
  placeholder: string; suffix: string; max: number
}) {
  return (
    <div className="flex items-center gap-1 h-10 rounded-lg border border-input bg-input/20 px-2 focus-within:border-zinc-400 transition-colors shrink-0">
      <input
        type="text"
        inputMode="numeric"
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        className="bg-transparent text-sm text-zinc-700 text-center outline-none tabular-nums w-7"
      />
      <span className="text-xs text-zinc-400">{suffix}</span>
    </div>
  )
}
