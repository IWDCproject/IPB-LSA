'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { calcCurrentSecs, formatSecs } from '@/lib/timerUtils'
import type { LiveState, TimerMode } from '@/types/directus'

// --- Types -----------------------------------------------------

type Props = {
  liveState: LiveState
  mode:      TimerMode
  duration:  number        // initial secs (0 = stopwatch start)
  onPatch:   (partial: Partial<LiveState>) => Promise<void>
  disabled?: boolean
}

// --- Komponen utama --------------------------------------------

export function TimerBlock({ liveState, mode, duration, onPatch, disabled }: Props) {
  const [display, setDisplay] = useState(() => calcCurrentSecs(liveState, mode))
  const rafRef                = useRef<number>(0)

  // update display tiap frame tanpa PATCH
  useEffect(() => {
    function tick() {
      setDisplay(calcCurrentSecs(liveState, mode))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [liveState, mode])

  // countdown habis - otomatis stop
  useEffect(() => {
    if (mode === 'countdown' && display <= 0 && liveState.timerRunning) {
      onPatch({
        timerRunning:      false,
        timerSecs:         0,
        timerLastStarted:  null,
      })
    }
  }, [display, mode, liveState.timerRunning, onPatch])

  const initSecs = mode === 'stopwatch' ? 0 : duration

  async function handleStart() {
    const current = calcCurrentSecs(liveState, mode)
    if (mode === 'countdown' && current <= 0) return
    await onPatch({
      timerRunning:     true,
      timerLastStarted: new Date().toISOString(),
      timerSecs:        current,
    })
  }

  async function handleStop() {
    await onPatch({
      timerRunning:     false,
      timerSecs:        calcCurrentSecs(liveState, mode),
      timerLastStarted: null,
    })
  }

  async function handleReset() {
    await onPatch({
      timerRunning:     false,
      timerSecs:        initSecs,
      timerLastStarted: null,
      timerFlags:       liveState.timerFlags ?? [],
    })
  }

  const isRunning = liveState.timerRunning

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">
        Timer <span className="text-zinc-400">({mode})</span>
      </p>

      {/* display utama */}
      <div className="text-5xl font-[800] text-zinc-900 tabular-nums tracking-tight mb-4"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {mode === 'deadline' && liveState.timerTarget
          ? formatDeadline(liveState.timerTarget)
          : formatSecs(display)}
      </div>

      {/* kontrol */}
      <div className="flex gap-2">
        <Button
          variant="noBorder"
          className="flex-1"
          onClick={handleReset}
          disabled={disabled || isRunning}
        >
          Reset
        </Button>
        {isRunning ? (
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleStop}
            disabled={disabled}
          >
            Stop
          </Button>
        ) : (
          <Button
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
            onClick={handleStart}
            disabled={disabled || (mode === 'countdown' && display <= 0)}
          >
            Start
          </Button>
        )}
      </div>

      {/* flag log */}
      {(liveState.timerFlags?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-0.5">
          {liveState.timerFlags.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-zinc-500">
              <span>{f.label}</span>
              <span className="tabular-nums">{formatSecs(f.secs)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Helpers ---------------------------------------------------

function formatDeadline(target: string): string {
  const diff = Math.max(0, (new Date(target).getTime() - Date.now()) / 1000)
  return formatSecs(diff)
}