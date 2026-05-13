'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { EnginePanelProps } from './types'

export default function ManualPickPanel({
  liveState, onPatch, format,
  participants, homeParticipant, awayParticipant,
}: EnginePanelProps) {
  const cfg = (format.modules[0] as {
    type: 'manual_pick'
    config: { allow_draw: boolean; top_n: number; ranked_order: boolean }
  }).config

  const { allow_draw, top_n, ranked_order } = cfg
  const isH2H = format.match_type === 'head_to_head'

  // -- H2H: winner pick ----------------------------------------

  const currentWinner = liveState.winner

  async function pickWinner(side: 'home' | 'away' | 'draw') {
    const id: string | null =
      side === 'draw' ? 'draw'
        : side === 'home' ? (homeParticipant?.id ?? null)
          : (awayParticipant?.id ?? null)
    await onPatch({ winner: id })
  }

  // -- Open: ranked list via dropdown --------------------------

  const pool = top_n > 0 ? participants.slice(0, top_n) : participants

  const savedRankings: Array<{ rank: number; id: string; name: string }> = liveState.rankings ?? []

  const [rankedIds, setRankedIds] = useState<string[]>(() =>
    savedRankings.map((r) => r.id)
  )
  const [addingId, setAddingId] = useState('')

  const lastExternalIdsRef = useRef<string[]>(savedRankings.map((r) => r.id))

  const hasUnsaved =
    JSON.stringify(rankedIds) !== JSON.stringify(savedRankings.map((r) => r.id))

  useEffect(() => {
    const incomingIds = (liveState.rankings ?? []).map((r) => r.id)

    // No local edits means rankedIds still matches our last-seen external baseline.
    const hasLocalEdits =
      JSON.stringify(rankedIds) !== JSON.stringify(lastExternalIdsRef.current)

    if (!hasLocalEdits) {
      setRankedIds(incomingIds)
    }
    lastExternalIdsRef.current = incomingIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(liveState.rankings)])

  const unranked = pool.filter((p) => !rankedIds.includes(p.id))

  function handleAdd() {
    if (!addingId || rankedIds.includes(addingId)) return
    setRankedIds((prev) => [...prev, addingId])
    setAddingId('')
  }

  function handleRemove(id: string) {
    setRankedIds((prev) => prev.filter((x) => x !== id))
  }

  function move(id: string, dir: -1 | 1) {
    setRankedIds((prev) => {
      const arr = [...prev]
      const i = arr.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return arr
        ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      return arr
    })
  }

  async function applyRankings() {
    const rankings = rankedIds
      .map((id, i) => {
        const p = pool.find((pp) => pp.id === id)
        return p ? { rank: i + 1, id: p.id, name: p.name } : null
      })
      .filter(Boolean) as Array<{ rank: number; id: string; name: string }>
    await onPatch({ rankings })
    // Sync the ref so the next external update sees no local edits.
    lastExternalIdsRef.current = rankedIds
  }

  // -- Render: H2H ---------------------------------------------

  if (isH2H) {
    const homeWon = currentWinner === homeParticipant?.id
    const awayWon = currentWinner === awayParticipant?.id
    const isDraw = currentWinner === 'draw'

    return (
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Manual Pick - Winner</p>
        </div>

        <div className="p-4 space-y-3">
          <div className={`grid gap-3 items-center ${allow_draw ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-2'}`}>
            <ConfirmDialog
              trigger={
                <button className={`w-full rounded-lg border-2 py-5 px-3 text-sm font-bold transition-colors text-center ${homeWon ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400 text-zinc-800'
                  }`}>
                  {homeParticipant?.name ?? 'Home'}
                  {homeWon && <div className="text-xs font-normal mt-1 opacity-70">✓ Winner</div>}
                </button>
              }
              title="Tetapkan pemenang?"
              description={`"${homeParticipant?.name ?? 'Home'}" akan ditetapkan sebagai pemenang.`}
              confirmLabel="Confirm"
              variant="filled"
              onConfirm={() => pickWinner('home')}
            />

            {allow_draw && (
              <ConfirmDialog
                trigger={
                  <button className={`rounded-lg border-2 py-2 px-3 text-xs font-bold transition-colors whitespace-nowrap ${isDraw ? 'border-zinc-500 bg-zinc-500 text-white' : 'border-zinc-200 hover:border-zinc-400 text-zinc-500'
                    }`}>
                    {isDraw ? '✓ Draw' : 'Draw'}
                  </button>
                }
                title="Seri?"
                description="Pertandingan ini akan ditetapkan sebagai seri."
                confirmLabel="Confirm"
                variant="filled"
                onConfirm={() => pickWinner('draw')}
              />
            )}

            <ConfirmDialog
              trigger={
                <button className={`w-full rounded-lg border-2 py-5 px-3 text-sm font-bold transition-colors text-center ${awayWon ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-400 text-zinc-800'
                  }`}>
                  {awayParticipant?.name ?? 'Away'}
                  {awayWon && <div className="text-xs font-normal mt-1 opacity-70">✓ Winner</div>}
                </button>
              }
              title="Tetapkan pemenang?"
              description={`"${awayParticipant?.name ?? 'Away'}" akan ditetapkan sebagai pemenang.`}
              confirmLabel="Confirm"
              variant="filled"
              onConfirm={() => pickWinner('away')}
            />
          </div>

          {currentWinner && (
            <div className="flex justify-end">
              <button
                onClick={() => onPatch({ winner: null })}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Clear pick
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // -- Render: Open / Solo -------------------------------------

  const rankLabel = (i: number) => {
    if (i === 0) return 'text-amber-500'
    if (i === 1) return 'text-zinc-400'
    if (i === 2) return 'text-orange-400'
    return 'text-zinc-400'
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Manual Pick - Rankings</p>
        {top_n > 0 && (
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">Top {top_n}</span>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* -- Add participant row -- */}
        {unranked.length > 0 && (
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Add participant</label>
            <div className="flex gap-2">
              <Select value={addingId} onValueChange={setAddingId}>
                <SelectTrigger className="!h-10 rounded-lg flex-1 text-sm">
                  <SelectValue placeholder="Select participant…" />
                </SelectTrigger>
                <SelectContent>
                  {unranked.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!addingId}
                className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm shrink-0 rounded-lg"
              >
                + Add
              </Button>
            </div>
          </div>
        )}

        {/* -- Ranked list -- */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Rankings - {rankedIds.length}{top_n > 0 ? ` / ${top_n}` : ''}
            </p>
            {rankedIds.length > 0 && (
              <button
                onClick={() => setRankedIds([])}
                className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {rankedIds.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-200 rounded-lg text-zinc-400">
              <p className="text-sm">No participants ranked yet</p>
              <p className="text-xs mt-0.5">Use the dropdown above to add</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rankedIds.map((id, i) => {
                const p = pool.find((x) => x.id === id)
                if (!p) return null
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                  >
                    <span className={`text-xs font-bold w-6 tabular-nums shrink-0 ${rankLabel(i)}`}>
                      #{i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{p.name}</span>
                    {ranked_order && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => move(id, -1)}
                          disabled={i === 0}
                          title="Move up"
                          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-20 transition-colors text-xs"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => move(id, 1)}
                          disabled={i === rankedIds.length - 1}
                          title="Move down"
                          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-20 transition-colors text-xs"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemove(id)}
                      title="Remove"
                      className="w-5 h-5 flex items-center justify-center rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* -- Apply button -- */}
        <div className="flex items-center justify-between pt-1">
          {hasUnsaved ? (
            <span className="text-xs text-amber-500">Unsaved changes</span>
          ) : savedRankings.length > 0 ? (
            <span className="text-xs text-emerald-500">✓ Saved</span>
          ) : (
            <span />
          )}
          <Button
            onClick={applyRankings}
            disabled={rankedIds.length === 0}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm h-10 px-4"
          >
            Apply Rankings
          </Button>
        </div>

        {/* -- Saved rankings (read-only summary) -- */}
        {savedRankings.length > 0 && (
          <div className="pt-3 border-t border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Saved</p>
            <div className="flex flex-wrap gap-1.5">
              {savedRankings.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full"
                >
                  <span className="font-bold text-zinc-400">#{r.rank}</span> {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}