'use client'

import { useFormatBuilder } from '@/stores/formatBuilder'

export function ScoreSetsPreview() {
  const { engine } = useFormatBuilder()
  const { setTerm, maxSets, setsToWin } = engine

  const setRows = Array.from({ length: maxSets }, (_, i) => i + 1)
  const dotCount = setsToWin

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900">Set Based Scores</p>
      </div>

      {/* Period bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-700">{setTerm} #1</span>
          <span className="text-xs text-zinc-400 bg-zinc-200 rounded px-1.5 py-0.5">idle</span>
          <span className="text-xs text-zinc-400">(1/{maxSets})</span>
        </div>
        <button className="text-xs border border-zinc-300 rounded px-2 py-0.5 text-zinc-600 hover:bg-zinc-100">
          Start {setTerm} 1
        </button>
      </div>

      {/* Score VS layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-0 p-4">
        {/* Team A */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-4 flex items-center">
            <p className="text-xs font-medium text-zinc-600">Tim A</p>
          </div>
          <button className="w-16 h-8 rounded bg-zinc-900 text-white text-lg font-bold flex items-center justify-center leading-none hover:bg-zinc-800 transition-colors">+</button>
          <div className="w-16 h-14 border-2 border-zinc-300 rounded flex items-center justify-center">
            <span 
              className="text-4xl text-zinc-900 leading-none  font-[800]" 
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              00
            </span>
          </div>
          <button className="w-16 h-8 rounded bg-zinc-900 text-white text-lg font-bold flex items-center justify-center leading-none hover:bg-zinc-800 transition-colors">−</button>
          {/* Set win dots */}
          <div className="h-4 flex items-center">
            <div className="flex gap-0.5">
              {Array.from({ length: dotCount }).map((_, i) => (
                <span key={i} className="text-xs text-zinc-400 leading-none">○</span>
              ))}
            </div>
          </div>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center px-4">
          <span className="text-lg font-bold text-zinc-400">VS</span>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-4 flex items-center">
            <p className="text-xs font-medium text-zinc-600">Tim B</p>
          </div>
          <button className="w-16 h-8 rounded bg-zinc-900 text-white text-lg font-bold flex items-center justify-center leading-none hover:bg-zinc-800 transition-colors">+</button>
          <div className="w-16 h-14 border-2 border-zinc-300 rounded flex items-center justify-center">
            <span 
              className="text-4xl text-zinc-900 leading-none  font-[800]" 
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              00
            </span>
          </div>
          <button className="w-16 h-8 rounded bg-zinc-900 text-white text-lg font-bold flex items-center justify-center leading-none hover:bg-zinc-800 transition-colors">−</button>
          {/* Set win dots */}
          <div className="h-4 flex items-center">
            <div className="flex gap-0.5">
              {Array.from({ length: dotCount }).map((_, i) => (
                <span key={i} className="text-xs text-zinc-400 leading-none">○</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Set history */}
      <div className="border-t border-zinc-100 px-4 py-2">
        <p className="text-xs font-semibold text-zinc-700 mb-1.5">Set History</p>
        <div className="space-y-1">
          {setRows.map((n) => (
            <div key={n} className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">{setTerm} #{n}</span>
              <span className="text-zinc-400">0–0</span>
              <button className="text-zinc-400 hover:text-zinc-600">Reopen Set</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}