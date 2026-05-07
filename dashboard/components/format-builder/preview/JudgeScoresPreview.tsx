'use client'

import { useFormatBuilder } from '@/stores/formatBuilder'

export function JudgeScoresPreview() {
  const { engine } = useFormatBuilder()
  const { numJudges } = engine

  const judges = Array.from({ length: numJudges }, (_, i) => i + 1)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">Judge Panel</p>
      </div>

      {/* Judge boxes */}
      <div className="p-4">
        <div className="flex gap-2 justify-center flex-wrap">
          {judges.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-500">Juri {n}</span>
              <div className="w-12 h-12 border-2 border-zinc-300 rounded flex items-center justify-center">
                <span className="text-xl font-[800] font-bebas text-zinc-900">0</span>
              </div>
            </div>
          ))}
        </div>

        {/* Average row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-600">
            Average: <span className="font-semibold text-zinc-900">–</span>
          </span>
          <button className="text-xs bg-zinc-900 text-white rounded px-3 py-1.5">
            Record &amp; Finish
          </button>
        </div>
      </div>
    </div>
  )
}
