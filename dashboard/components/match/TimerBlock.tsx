'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { calcCurrentSecs, formatSecs } from '@/lib/timerUtils'
import type { LiveState, TimerMode } from '@/types/directus'

// --- Types -----------------------------------------------------

type Props = {
  liveState: LiveState
  mode:      TimerMode
  duration:  number
  onPatch:   (partial: Partial<LiveState>) => Promise<void>
  disabled?: boolean
}

// --- Komponen utama --------------------------------------------

export function TimerBlock({ liveState, mode, duration, onPatch, disabled }: Props) {
  const [display, setDisplay] = useState(() => calcCurrentSecs(liveState, mode))
  const rafRef                = useRef<number>(0)

  // FIX: was running a requestAnimationFrame loop unconditionally, even when the
  // timer was stopped. This meant the RAF callback fired ~60 times/second for
  // every TimerBlock on the page regardless of whether the timer was running —
  // wasting CPU and battery with no visual benefit (the display value doesn't
  // change while stopped).
  //
  // Now: when not running, set the display once and skip the loop entirely.
  // When running, start the RAF loop and cancel it on cleanup.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)

    if (!liveState.timerRunning) {
      // Timer is paused/stopped — snapshot the current value and bail.
      setDisplay(calcCurrentSecs(liveState, mode))
      return
    }

    function tick() {
      setDisplay(calcCurrentSecs(liveState, mode))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [liveState, mode])

  // FIX: without a guard ref, this effect could call onPatch many times before
  // the liveState prop updated. The RAF loop updates `display` at ~60fps; every
  // frame where display <= 0 triggered a new PATCH request until the server
  // responded and the component re-rendered with timerRunning = false.
  //
  // `stoppingRef` acts as a one-shot lock: set to true on the first stop call,
  // reset after the patch resolves so the guard lifts if the timer is restarted.
  const stoppingRef = useRef(false)

  useEffect(() => {
    if (
      mode === 'countdown' &&
      display <= 0 &&
      liveState.timerRunning &&
      !stoppingRef.current
    ) {
      stoppingRef.current = true
      onPatch({
        timerRunning:     false,
        timerSecs:        0,
        timerLastStarted: null,
      }).finally(() => {
        stoppingRef.current = false
      })
    }
  }, [display, mode, liveState.timerRunning, onPatch])

  const initSecs  = mode === 'stopwatch' ? 0 : duration
  const isRunning = liveState.timerRunning

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

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">
        Timer <span className="text-zinc-400">({mode})</span>
      </p>

      <div
        className="text-5xl font-[800] text-zinc-900 tabular-nums tracking-tight mb-4"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {mode === 'deadline' && liveState.timerTarget
          ? formatDeadline(liveState.timerTarget)
          : formatSecs(display)}
      </div>

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