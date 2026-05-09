'use client'

import { useFormatBuilder } from '@/stores/formatBuilder'

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

export function ManualPickPreview() {
  const { matchType, engine } = useFormatBuilder()
  const { allowDraw, topN, rankedOrder } = engine

  if (matchType === 'head_to_head') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Manual Pick <span className="font-normal text-zinc-500">(declare winner)</span></p>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded bg-zinc-900 text-white text-sm font-semibold">
              Tim A
            </button>
            <div className="flex items-center px-1">
              <span className="text-sm font-bold text-zinc-400">VS</span>
            </div>
            <button className="flex-1 py-2.5 rounded bg-zinc-900 text-white text-sm font-semibold">
              Tim B
            </button>
          </div>
          {allowDraw && (
            <button className="w-full py-2 rounded border border-zinc-300 text-zinc-600 text-sm">
              Draw
            </button>
          )}
        </div>
      </div>
    )
  }

  // open - ranked
  if (rankedOrder) {
    const positions = Array.from({ length: topN }, (_, i) => i)
    return (
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Manual Pick <span className="font-normal text-zinc-500">(ranked)</span></p>
        </div>
        <div className="p-4 space-y-2">
          {positions.map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 w-8 shrink-0">
                {ORDINAL[i] ?? `${i + 1}th`}
              </span>
              <div className="flex-1 h-8 rounded border border-zinc-200 bg-zinc-50 px-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400 italic">pick a winner</span>
                <span className="text-zinc-300">▾</span>
              </div>
            </div>
          ))}
          <button className="w-full mt-2 py-2 rounded bg-zinc-900 text-white text-xs font-semibold">
            Finalize Results
          </button>
        </div>
      </div>
    )
  }

  // open - unranked
  const positions = Array.from({ length: topN }, (_, i) => i)
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">Manual Pick <span className="font-normal text-zinc-500">(unranked)</span></p>
      </div>
      <div className="p-4 space-y-2">
        {positions.map((i) => (
          <div key={i} className="h-8 rounded border border-zinc-200 bg-zinc-50 px-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400 italic">pick a winner</span>
            <span className="text-zinc-300">▾</span>
          </div>
        ))}
        <button className="w-full mt-2 py-2 rounded bg-zinc-900 text-white text-xs font-semibold">
          Finalize Results
        </button>
      </div>
    </div>
  )
}