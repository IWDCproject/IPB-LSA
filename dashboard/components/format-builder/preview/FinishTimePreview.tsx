'use client'

import { useFormatBuilder } from '@/stores/formatBuilder'

const MOCK_PARTICIPANTS =[
  'Gilang Muhamad W.',
  'Arisyida L. A.',
  'Budi Santoso',
  'Citra Dewi',
]

const MOCK_RECORDINGS =[
  { name: 'Gilang Muhamad W.', time: '2m 12s 32ms' },
  { name: 'Arisyida L. A.', time: '2m 24s 78ms' },
]

export function FinishTimePreview() {
  const { engine, matchType } = useFormatBuilder()
  const { rankOrder, unit } = engine

  const title = rankOrder === 'asc' ? 'Finish Times (tercepat)' : 'Finish Times (terlama)'
  const showMs = unit === 'ms'

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
      </div>

      {/* Input row */}
      <div className="p-4 space-y-3">
        {/* Participant dropdown */}
        {matchType !== 'solo' && (
          <div>
            <p className="text-xs text-zinc-500 mb-1">Peserta</p>
            <div className="h-8 rounded border border-zinc-200 bg-zinc-50 px-2 flex items-center justify-between">
              <span className="text-xs text-zinc-400 italic">pilih peserta</span>
              <span className="text-zinc-300">▾</span>
            </div>
          </div>
        )}

        {/* Time inputs + Record button */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 mb-1">Waktu</p>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 h-8 rounded border border-zinc-200 bg-zinc-50 px-2">
                <input
                  className="w-7 bg-transparent text-xs text-zinc-600 text-center outline-none tabular-nums"
                  placeholder="00"
                  maxLength={2}
                  readOnly
                />
                <span className="text-xs text-zinc-400">m</span>
              </div>
              <div className="flex items-center gap-1 h-8 rounded border border-zinc-200 bg-zinc-50 px-2">
                <input
                  className="w-7 bg-transparent text-xs text-zinc-600 text-center outline-none tabular-nums"
                  placeholder="00"
                  maxLength={2}
                  readOnly
                />
                <span className="text-xs text-zinc-400">s</span>
              </div>
              {showMs && (
                <div className="flex items-center gap-1 h-8 rounded border border-zinc-200 bg-zinc-50 px-2">
                  <input
                    className="w-8 bg-transparent text-xs text-zinc-600 text-center outline-none tabular-nums"
                    placeholder="000"
                    maxLength={3}
                    readOnly
                  />
                  <span className="text-xs text-zinc-400">ms</span>
                </div>
              )}
            </div>
          </div>
          <button className="h-8 px-3 rounded bg-zinc-900 text-white text-xs shrink-0">
            Record
          </button>
        </div>

        {/* Recordings */}
        <div>
          <p className="text-xs font-semibold text-zinc-700 mb-1.5">Recordings</p>
          <div className="space-y-1">
            {MOCK_RECORDINGS.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">{i + 1}. {r.name}</span>
                <span className="text-zinc-500 tabular-nums">{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}