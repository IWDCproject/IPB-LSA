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
  const m  = parseInt(t.match(/(\d+)m/)?.[1]  ?? '0', 10)
  const s  = parseInt(t.match(/(\d+)s/)?.[1]  ?? '0', 10)
  const ms = parseInt(t.match(/(\d+)ms/)?.[1] ?? '0', 10)
  return m * 60000 + s * 1000 + ms
}

// --- Component -----------------------------------------------

export default function FinishTimePanel({ liveState, onPatch, format, participants }: Props) {
  const cfg = (format.modules[0] as {
    type: 'finish_time'
    config: { unit: 's' | 'ms'; rank_order: 'asc' | 'desc' }
  }).config

  const showMs  = cfg.unit === 'ms'
  const rankAsc = cfg.rank_order === 'asc'
  const isSolo  = participants.length === 1

  const [selectedId, setSelectedId] = useState('')
  const [mins, setMins] = useState('')
  const [secs, setSecs] = useState('')
  const [ms,   setMs]   = useState('')

  const loggedIds = new Set<string>(liveState.timeLog.map((e: TimeLogEntry) => e.id ?? e.name))
  const pending   = participants.filter((p) => !loggedIds.has(p.id) && !loggedIds.has(p.name))
  const allDone   = pending.length === 0 && participants.length > 0

  function buildSortedLog(log: TimeLogEntry[]) {
    return [...log].sort((a, b) => {
      const d = parseTimeStr(a.time) - parseTimeStr(b.time)
      return rankAsc ? d : -d
    })
  }

  function buildRankings(log: TimeLogEntry[]) {
    return buildSortedLog(log).map((e, i) => ({
      rank: i + 1,
      id:   e.id ?? e.name,
      name: e.name,
    }))
  }

  async function handleRecord() {
    const participant = isSolo
      ? participants[0]
      : participants.find((p) => p.id === selectedId)
    if (!participant) return

    const m_  = parseInt(mins || '0', 10)
    const s_  = parseInt(secs || '0', 10)
    const ms_ = parseInt(ms   || '0', 10)
    const timeStr = showMs ? `${m_}m ${s_}s ${ms_}ms` : `${m_}m ${s_}s`

    const newLog: TimeLogEntry[] = [
      ...liveState.timeLog,
      { id: participant.id, name: participant.name, time: timeStr },
    ]
    await onPatch({ timeLog: newLog, rankings: buildRankings(newLog) })

    setSelectedId('')
    setMins(''); setSecs(''); setMs('')
  }

  async function handleRemove(id: string) {
    const newLog: TimeLogEntry[] = liveState.timeLog.filter((e: TimeLogEntry) => e.id !== id && e.name !== id)
    await onPatch({ timeLog: newLog, rankings: buildRankings(newLog) })
  }

  const canRecord = (isSolo || selectedId) && (mins || secs || (showMs && ms))
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

        {/* ── Input row ── */}
        {!allDone && (
          <div className="flex items-center gap-2">
            {/* Participant selector */}
            {!isSolo && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-9 min-w-0 flex-[2] text-sm">
                  <SelectValue placeholder="Select participant…" />
                </SelectTrigger>
                <SelectContent>
                  {pending.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Time inputs */}
            <TimeInput value={mins} onChange={setMins} placeholder="0"   suffix="m"  max={3} />
            <span className="text-zinc-300 text-sm shrink-0">:</span>
            <TimeInput value={secs} onChange={setSecs} placeholder="00"  suffix="s"  max={2} />
            {showMs && (
              <>
                <span className="text-zinc-300 text-sm shrink-0">.</span>
                <TimeInput value={ms} onChange={setMs} placeholder="000" suffix="ms" max={3} />
              </>
            )}

            <Button
              disabled={!canRecord}
              onClick={handleRecord}
              className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm shrink-0"
            >
              Record
            </Button>
          </div>
        )}

        {/* ── Results list ── */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Results — {sortedLog.length} / {participants.length}
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
    <div className="flex items-center gap-1 h-9 rounded-lg border border-zinc-200 bg-white px-2 focus-within:border-zinc-400 transition-colors shrink-0">
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