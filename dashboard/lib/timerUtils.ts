import type { LiveState, TimerMode } from '@/types/directus'

// snapshot + elapsed — jangan PATCH tiap tick
export function calcCurrentSecs(live: LiveState, mode: TimerMode): number {
  const isStopwatch = mode === 'stopwatch'
  const snapshot    = Math.max(0, live.timerSecs ?? 0)
  if (!live.timerRunning || !live.timerLastStarted) return snapshot
  const elapsed = Math.max(0, (Date.now() - new Date(live.timerLastStarted).getTime()) / 1000)
  return isStopwatch ? snapshot + elapsed : Math.max(0, snapshot - elapsed)
}

export function formatSecs(totalSecs: number): string {
  const s   = Math.floor(totalSecs)
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}