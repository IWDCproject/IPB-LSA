'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter }        from 'next/navigation'
import { ENGINE_PANELS }    from './engines'
import { TimerBlock }       from './TimerBlock'
import { OperatorNotes }    from './OperatorNotes'
import { OperatorOverride } from './OperatorOverride'
import { ConfirmDialog }    from '@/components/shared/ConfirmDialog'
import { Button }           from '@/components/ui/button'
import { StatusBadge }      from '@/components/shared/StatusBadge'
import { patchLiveStateAction, setMatchStatusAction } from './_actions'
import type { MatchFormat, Participant, LiveState } from '@/types/directus'
import { DEFAULT_LIVE_STATE } from '@/lib/liveStateDefaults'

// --- Types -----------------------------------------------------

type Props = {
  matchId:          string
  initialLiveState: LiveState
  format:           MatchFormat
  participants:     Participant[]
  homeParticipant:  Participant | null
  awayParticipant:  Participant | null
  categoryName:     string
  isSuperAdmin:     boolean
  matchName?:       string
  round?:           string
}

// FIX: was typed `any`, which propagated silently wrong values and suppressed
// TS errors for callers. Now fully typed so mismatches are caught at compile time.
type MatchWinnerSelectorProps = {
  explicitWinnerId: string | null
  autoWinnerId:     string | null
  homeParticipant:  Participant | null
  awayParticipant:  Participant | null
  onPatch:          (partial: Partial<LiveState>) => Promise<void>
  disabled:         boolean
}

// --- Komponen utama --------------------------------------------

export function ControlPanel({
  matchId, initialLiveState, format, participants,
  homeParticipant, awayParticipant,
  categoryName, isSuperAdmin,
  matchName, round,
}: Props) {
  const router = useRouter()
  const [liveState, setLiveState] = useState<LiveState>({
    ...DEFAULT_LIVE_STATE,
    ...(initialLiveState || {}),
  })
  const [isPending, startTransition] = useTransition()

  // FIX: store the pre-patch snapshot so we can roll back if the server action fails.
  // Without this, a failed PATCH leaves the UI in the optimistically-updated state
  // indefinitely, showing data that was never persisted.
  const prevLiveStateRef = useRef<LiveState | null>(null)

  const patch = useCallback(async (partial: Partial<LiveState>) => {
    setLiveState((prev) => {
      prevLiveStateRef.current = prev
      return { ...prev, ...partial }
    })
    startTransition(async () => {
      const res = await patchLiveStateAction(matchId, partial)
      if (res.success) {
        router.refresh()
      } else {
        console.error('patch failed:', res.error)
        // Roll back optimistic update to the state before this patch.
        if (prevLiveStateRef.current) {
          setLiveState(prevLiveStateRef.current)
        }
      }
    })
  }, [matchId, router])

  const timerModule = format.modules.find((m) => m.type === 'timer') as
    | { type: 'timer'; config: { mode: 'countdown' | 'stopwatch' | 'deadline'; duration?: number } }
    | undefined

  const hasNotes   = format.modules.some((m) => m.type === 'notes')
  const engineType = format.modules[0]?.type
  const EnginePanel = engineType ? ENGINE_PANELS[engineType as keyof typeof ENGINE_PANELS] : null

  const matchTitle = matchName
    ?? (homeParticipant && awayParticipant
      ? `${homeParticipant.name} vs ${awayParticipant.name}`
      : 'Pertandingan')

  const matchSubtitle = [categoryName, round].filter(Boolean).join(' · ')
  const status = liveState.matchStatus
  const isH2H  = format.match_type === 'head_to_head'

  // --- Auto-Calculation Logic (The Suggestion Engine) ---------

  let autoWinnerId: string | null = null

  if (isH2H) {
    if (engineType === 'score_timed') {
      // FIX: was suggesting a winner based on score at any time, even mid-match
      // (e.g. during Period 1 of 3). Now only fires after all periods are done to
      // avoid showing a misleading "Home wins" badge during a halftime break.
      const scoreModule = format.modules.find((m) => m.type === 'score_timed') as
        | { type: 'score_timed'; config: { has_periods: boolean; period_count?: number } }
        | undefined
      const hasPeriods   = scoreModule?.config.has_periods ?? false
      const periodCount  = scoreModule?.config.period_count ?? 1
      const allDone = !hasPeriods ||
        (liveState.periodPhase === 'halftime' && (liveState.periodIdx ?? 0) + 1 >= periodCount)

      if (allDone) {
        const home = liveState.homeScore ?? 0
        const away = liveState.awayScore ?? 0
        if (home > away)      autoWinnerId = homeParticipant?.id ?? null
        else if (away > home) autoWinnerId = awayParticipant?.id ?? null
        else                  autoWinnerId = 'draw'
      }
    } else if (engineType === 'score_sets') {
      const setsModule = format.modules.find((m) => m.type === 'score_sets') as
        | { type: 'score_sets'; config: { sets_to_win: number } }
        | undefined
      const toWin = setsModule?.config.sets_to_win ?? 0
      const home  = liveState.setsWon?.[0] ?? 0
      const away  = liveState.setsWon?.[1] ?? 0
      if (toWin > 0 && home >= toWin)      autoWinnerId = homeParticipant?.id ?? null
      else if (toWin > 0 && away >= toWin) autoWinnerId = awayParticipant?.id ?? null
    }
  }

  const explicitWinnerId = liveState.winner
  const finalWinnerId    = explicitWinnerId !== null ? explicitWinnerId : autoWinnerId

  // --- Status transitions ------------------------------------

  async function handleStartMatch() {
    const timerDuration = timerModule?.config.duration ?? 0
    const partial: Partial<LiveState> = {
      matchStatus:      'live',
      timerSecs:        timerModule ? timerDuration : 0,
      timerRunning:     false,
      timerLastStarted: null,
    }
    setLiveState((prev) => {
      prevLiveStateRef.current = prev
      return { ...prev, ...partial }
    })
    startTransition(async () => {
      const res = await setMatchStatusAction(matchId, 'live', partial)
      if (res.success) {
        router.refresh()
      } else if (prevLiveStateRef.current) {
        setLiveState(prevLiveStateRef.current)
      }
    })
  }

  async function handleFinishMatch() {
    const partial: Partial<LiveState> = {
      timerRunning:     false,
      timerLastStarted: null,
    }
    if (isH2H && finalWinnerId !== null) {
      partial.winner = finalWinnerId
    }
    setLiveState((prev) => {
      prevLiveStateRef.current = prev
      return { ...prev, ...partial, matchStatus: 'finished' }
    })
    startTransition(async () => {
      const res = await setMatchStatusAction(matchId, 'finished', partial)
      if (res.success) {
        router.refresh()
      } else if (prevLiveStateRef.current) {
        setLiveState(prevLiveStateRef.current)
      }
    })
  }

  async function handleContinue() {
    setLiveState((prev) => {
      prevLiveStateRef.current = prev
      return { ...prev, matchStatus: 'live' }
    })
    startTransition(async () => {
      const res = await setMatchStatusAction(matchId, 'live')
      if (res.success) {
        router.refresh()
      } else if (prevLiveStateRef.current) {
        setLiveState(prevLiveStateRef.current)
      }
    })
  }

  async function handleFullReset() {
    // FIX: was iterating Object.keys(liveState) with `as any`, which is fragile
    // (misses new keys, includes unexpected runtime keys, resets judgeScores to
    // null[] which fails the server's z.array(z.number()) schema). Now explicitly
    // builds a clean reset from DEFAULT_LIVE_STATE with only the timer duration
    // overridden, and resets judgeScores to [] (empty, valid array of numbers).
    const timerDuration = timerModule?.config.duration ?? 0
    const next: LiveState = {
      ...DEFAULT_LIVE_STATE,
      matchStatus:      'upcoming',
      timerSecs:        timerDuration,
      timerRunning:     false,
      timerLastStarted: null,
      judgeScores:      [],
      // Add this line to satisfy the strict union type:
      periodPhase:      'idle', 
    }
    setLiveState((prev) => {
      prevLiveStateRef.current = prev
      return next
    })
    startTransition(async () => {
      const res = await setMatchStatusAction(matchId, 'upcoming', next)
      if (res.success) {
        router.refresh()
      } else if (prevLiveStateRef.current) {
        setLiveState(prevLiveStateRef.current)
      }
    })
  }

  const isUpcoming = status === 'upcoming'
  const isLive     = status === 'live'
  const isFinished = status === 'finished'
  const patching   = isPending

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">{matchSubtitle}</p>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">{matchTitle}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={status ?? 'upcoming'} />
            {format.name && <span className="text-xs text-zinc-400">[{format.name}]</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUpcoming && (
            <Button onClick={handleStartMatch} disabled={patching} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              Start Match
            </Button>
          )}

          {isLive && (
            <ConfirmDialog
              trigger={<Button variant="noBorder" disabled={patching}>Finish Match</Button>}
              title="Selesaikan pertandingan?"
              description="Status akan diubah menjadi 'finished'. Hasil akhir beserta pemenang akan disimpan ke sistem."
              confirmLabel="Finish Match"
              variant="filled"
              onConfirm={handleFinishMatch}
            />
          )}

          {(isLive || isFinished) && (
            <>
              {isFinished && (
                <Button variant="noBorder" onClick={handleContinue} disabled={patching}>Reopen Match</Button>
              )}
              <ConfirmDialog
                trigger={<Button variant="noBorder" disabled={patching}>Full Reset [!]</Button>}
                title="Full Reset?"
                description="Semua data pertandingan akan direset. Aksi ini tidak bisa dibatalkan."
                confirmLabel="Full Reset"
                variant="destructive"
                onConfirm={handleFullReset}
              />
            </>
          )}
        </div>
      </div>

      {/* layout 2 kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3">
        <div className="space-y-3">
          {EnginePanel && (
            <EnginePanel
              liveState={liveState}
              onPatch={patch}
              format={format}
              participants={participants}
              homeParticipant={homeParticipant}
              awayParticipant={awayParticipant}
            />
          )}

          {isH2H && engineType !== 'manual_pick' && (
            <MatchWinnerSelector
              explicitWinnerId={explicitWinnerId}
              autoWinnerId={autoWinnerId}
              homeParticipant={homeParticipant}
              awayParticipant={awayParticipant}
              onPatch={patch}
              disabled={patching}
            />
          )}

          {isSuperAdmin && <OperatorOverride liveState={liveState} onPatch={patch} />}
        </div>

        <div className="space-y-3">
          {timerModule && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <TimerBlock
                liveState={liveState}
                mode={timerModule.config.mode}
                duration={timerModule.config.duration ?? 0}
                onPatch={patch}
                disabled={patching || isFinished}
              />
            </div>
          )}
          {hasNotes && (
            <OperatorNotes liveState={liveState} onPatch={patch} disabled={patching} />
          )}
        </div>
      </div>
    </div>
  )
}

// --- Component: MatchWinnerSelector ----------------------------

function MatchWinnerSelector({
  explicitWinnerId, autoWinnerId, homeParticipant, awayParticipant, onPatch, disabled,
}: MatchWinnerSelectorProps) {
  async function pickWinner(side: 'home' | 'away' | 'draw' | 'clear') {
    if (side === 'clear') { await onPatch({ winner: null }); return }
    const id =
      side === 'draw' ? 'draw'
      : side === 'home' ? (homeParticipant?.id ?? null)
      : (awayParticipant?.id ?? null)
    await onPatch({ winner: id })
  }

  const isOverridden  = explicitWinnerId !== null
  const activeWinner  = isOverridden ? explicitWinnerId : autoWinnerId
  const isHome        = homeParticipant != null && activeWinner === homeParticipant.id
  const isAway        = awayParticipant != null && activeWinner === awayParticipant.id
  const isDraw        = activeWinner === 'draw'

  const activeClasses   = 'border-zinc-900 bg-zinc-900 text-white'
  const inactiveClasses = 'border-zinc-200 hover:border-zinc-900 bg-white text-zinc-800'

  const options = [
    { side: 'home' as const, label: homeParticipant?.name ?? 'Home', active: isHome },
    { side: 'draw' as const, label: 'Draw',                          active: isDraw },
    { side: 'away' as const, label: awayParticipant?.name ?? 'Away', active: isAway },
  ]

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900">Match Resolution</p>
          {isOverridden && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-300 bg-zinc-100 text-zinc-600 uppercase tracking-wider">
              Override
            </span>
          )}
        </div>
        {isOverridden && (
          <button onClick={() => pickWinner('clear')} disabled={disabled} className="text-xs text-zinc-400 hover:text-zinc-900">
            Clear
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="grid gap-2 grid-cols-3 items-stretch">
          {options.map((item) => (
            <ConfirmDialog
              key={item.side}
              trigger={
                <button
                  disabled={disabled}
                  className={`w-full rounded-lg border-2 py-3 px-2 text-xs font-bold transition-all ${item.active ? activeClasses : inactiveClasses}`}
                >
                  <div className="truncate w-full">{item.label}</div>
                  {item.active && (
                    <div className="text-[9px] font-bold mt-0.5 opacity-70 uppercase tracking-wider">
                      {isOverridden ? 'Forced' : 'Auto'}
                    </div>
                  )}
                </button>
              }
              title="Set Winner"
              description={`Set result to ${item.label}?`}
              confirmLabel="Confirm"
              variant="filled"
              onConfirm={() => pickWinner(item.side)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}