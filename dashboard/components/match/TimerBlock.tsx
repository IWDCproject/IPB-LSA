'use client'

import { useEffect, useRef, useState, Fragment } from 'react'
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
  const isDeadline = mode === 'deadline'

  // ---- Countdown / Stopwatch display ----------------------------
  const [display, setDisplay] = useState(() =>
    isDeadline ? Math.round(calcDeadlineSecs(liveState.timerTarget ?? null)) : Math.round(liveState.timerSecs ?? 0)
  )
  const [mounted, setMounted] = useState(false)
  const [isOverriding, setIsOverriding] = useState(false)
  const [overrideDraft, setOverrideDraft] = useState<string[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // For countdown/stopwatch: only run RAF when timer is running.
  // For deadline: always run RAF so the live countdown updates every frame.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)

    if (isDeadline) {
      function tick() {
        setDisplay(calcDeadlineSecs(liveState.timerTarget ?? null))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }

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
  }, [liveState, mode, isDeadline])

  // ---- Auto-stop for countdown ---------------------------------
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

  // ---- Deadline: datetime input ---------------------------------
  // Convert the stored ISO timerTarget to/from the value format
  // expected by <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
  const [deadlineInput, setDeadlineInput] = useState(() =>
    isoToLocalDatetimeInput(liveState.timerTarget ?? null)
  )
  // Keep the local input in sync when timerTarget changes externally
  // (e.g. another operator updates it).
  useEffect(() => {
    setDeadlineInput(isoToLocalDatetimeInput(liveState.timerTarget ?? null))
  }, [liveState.timerTarget])

  async function handleDeadlineSet() {
    if (!deadlineInput) return
    // Parse the local datetime string as a local time and convert to ISO.
    const iso = new Date(deadlineInput).toISOString()
    await onPatch({ timerTarget: iso })
  }

  async function handleDeadlineClear() {
    setDeadlineInput('')
    await onPatch({ timerTarget: null })
  }

  // ---- Countdown / Stopwatch controls --------------------------
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

  // ---- Override Logic ------------------------------------------
  function handleToggleOverride() {
    if (isOverriding) {
      setIsOverriding(false)
    } else {
      // Snapshot the current values into a fixed 4-part draft [d, h, m, s]
      const s = Math.floor(display)
      const sec = s % 60
      const min = Math.floor(s / 60) % 60
      const hrs = Math.floor(s / 3_600) % 24
      const day = Math.floor(s / 86_400)
      
      setOverrideDraft([
        String(day),
        String(hrs).padStart(2, '0'),
        String(min).padStart(2, '0'),
        String(sec).padStart(2, '0')
      ])
      setIsOverriding(true)
      if (liveState.timerRunning) {
        handleStop()
      }
    }
  }

  async function handleApplyOverride() {
    const [d, h, m, s] = overrideDraft
    const total = 
      parseInt(d || '0') * 86400 +
      parseInt(h || '0') * 3600 +
      parseInt(m || '0') * 60 +
      parseInt(s || '0')

    await onPatch({
      timerSecs:        total,
      timerRunning:     false,
      timerLastStarted: null,
    })
    setIsOverriding(false)
  }

  // ---- Render --------------------------------------------------
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-500">
          Timer <span className="text-zinc-400">({mode})</span>
        </p>
        {!isDeadline && (
          <button
            onClick={handleToggleOverride}
            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isOverriding ? 'text-amber-600 hover:text-amber-700' : 'text-zinc-400 hover:text-zinc-900'
            }`}
          >
            {isOverriding ? 'Cancel' : 'Override'}
          </button>
        )}
      </div>

      {/* --- Override Inputs --- */}
      {isOverriding && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100 flex items-end gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex-1 grid grid-cols-4 gap-2">
            {[
              { label: 'days', val: overrideDraft[0], max: 3 },
              { label: 'hrs',  val: overrideDraft[1], max: 2 },
              { label: 'mins', val: overrideDraft[2], max: 2 },
              { label: 'secs', val: overrideDraft[3], max: 2 },
            ].map((input, i) => (
              <div key={input.label}>
                <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">{input.label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input.val ?? ''}
                  onChange={(e) => {
                    const next = [...overrideDraft]
                    next[i] = e.target.value.replace(/\D/g, '').slice(0, input.max)
                    setOverrideDraft(next)
                  }}
                  className="w-full h-9 rounded border border-zinc-200 bg-white text-sm font-bold text-center focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all tabular-nums"
                />
              </div>
            ))}
          </div>
          <Button
            className="h-9 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded"
            onClick={handleApplyOverride}
          >
            Save
          </Button>
        </div>
      )}

      {/* Big display */}
      <div suppressHydrationWarning className="mb-4">
        <div className="flex justify-start items-start text-zinc-900 tracking-tight leading-none">
          {formatSecs(mounted ? display : Math.round(liveState.timerSecs ?? 0)).split(':').map((part, i, arr) => {
            const label = arr.length === 4 ? ['d', 'hh', 'mm', 'ss'][i]
                        : arr.length === 3 ? ['hh', 'mm', 'ss'][i]
                        : ['mm', 'ss'][i]
            const fSize = arr.length === 4 ? '2.75rem' : arr.length === 3 ? '3.25rem' : '3.5rem'
            return (
              <Fragment key={label}>
                <div className="flex flex-col items-center flex-1">
                  <span 
                    suppressHydrationWarning
                    className="font-[800] tabular-nums" 
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: fSize }}
                  >
                    {part}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="font-[800] tabular-nums text-zinc-300" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: fSize, marginTop: '-2px' }}>:</div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* --- Deadline-specific UI --- */}
      {isDeadline ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">
            {liveState.timerTarget
              ? <>Target: <span className="font-medium text-zinc-700">{fmtTarget(liveState.timerTarget)}</span></>
              : 'No deadline set'}
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              disabled={disabled}
              className="flex-1 text-xs rounded-md border border-zinc-200 px-2 py-1.5 text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
            />
            <Button
              variant="noBorder"
              className="shrink-0"
              onClick={handleDeadlineSet}
              disabled={disabled || !deadlineInput}
            >
              Set
            </Button>
            {liveState.timerTarget && (
              <Button
                variant="noBorder"
                className="shrink-0 text-red-500 hover:text-red-600"
                onClick={handleDeadlineClear}
                disabled={disabled}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* --- Countdown / Stopwatch controls --- */
        <div className="flex gap-2">
          <Button
            variant="noBorder"
            className="flex-1"
            onClick={handleReset}
            disabled={disabled || isRunning || isOverriding}
          >
            Reset
          </Button>
          {isRunning ? (
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleStop}
              disabled={disabled || isOverriding}
            >
              Stop
            </Button>
          ) : (
            <Button
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
              onClick={handleStart}
              disabled={disabled || (mode === 'countdown' && display <= 0) || isOverriding}
            >
              Start
            </Button>
          )}
        </div>
      )}

      {/* Timer flags (non-deadline modes) */}
      {!isDeadline && (liveState.timerFlags?.length ?? 0) > 0 && (
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

/** Seconds remaining until the absolute target ISO string. */
function calcDeadlineSecs(target: string | null): number {
  if (!target) return 0
  return Math.max(0, Math.round((new Date(target).getTime() - Date.now()) / 1000))
}

/**
 * Convert an ISO string → the value format for <input type="datetime-local">
 * which expects "YYYY-MM-DDTHH:mm" in LOCAL time.
 */
function isoToLocalDatetimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  // getTimezoneOffset returns minutes behind UTC, so subtract it to get local time
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** Human-readable display of the stored target time. */
function fmtTarget(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}