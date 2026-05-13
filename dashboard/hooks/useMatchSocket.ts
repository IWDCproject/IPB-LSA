'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { directus } from '@/lib/directus'
import { readItem } from '@directus/sdk'
import { patchLiveStateAction } from '@/components/match/_actions'
import type { Match, LiveState, MatchStatus } from '@/types/directus'

// --- Types -----------------------------------------------------

type PatchFn = (partial: Partial<LiveState>) => Promise<void>

type UseMatchSocketReturn = {
  match:      Match | null
  liveState:  LiveState | null
  status:     MatchStatus | null
  loading:    boolean
  patch:      PatchFn
  patching:   boolean
}

// --- Hook ------------------------------------------------------

export function useMatchSocket(matchId: string): UseMatchSocketReturn {
  const [match,     setMatch]     = useState<Match | null>(null)
  const [liveState, setLiveState] = useState<LiveState | null>(null)
  const [status,    setStatus]    = useState<MatchStatus | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [patching,  setPatching]  = useState(false)

  // unsubscribe ref agar cleanup bisa dipanggil dengan benar
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // ambil data awal via REST
      const data = await directus.request(
        readItem('matches', matchId, {
          fields: ['*', 'home_participant_id.*', 'away_participant_id.*'],
        })
      ) as unknown as Match

      if (cancelled) return

      setMatch(data)
      setLiveState(data.live_state)
      setStatus(data.status)
      setLoading(false)

      // subscribe WebSocket untuk update live_state & status
      directus.connect()
      const { subscription, unsubscribe } = await directus.subscribe('matches', {
        event: 'update',
        query: {
          filter: { id: { _eq: matchId } },
          fields: ['live_state', 'status'],
        },
      })

      unsubRef.current = unsubscribe

      for await (const event of subscription) {
        if (cancelled) break
        // guard: hanya proses event yg punya data (bukan error/init)
        if (!('data' in event) || !event.data) continue
        const updated = (event.data as unknown as Match[])[0]
        if (!updated) continue
        setLiveState(updated.live_state)
        setStatus(updated.status)
      }
    }

    init().catch(console.error)

    return () => {
      cancelled = true
      unsubRef.current?.()
      directus.disconnect()
    }
  }, [matchId])

  // Patch goes through the server action (admin token) instead of the
  // user-facing directus client, which hits permission errors.
  // Optimistic update first → server confirms → WebSocket pushes truth back.
  const patch: PatchFn = useCallback(async (partial) => {
    setPatching(true)
    try {
      setLiveState((prev) => prev ? { ...prev, ...partial } : prev)
      const res = await patchLiveStateAction(matchId, partial)
      if (!res.success) console.error('[patch]', res.error)
      // WebSocket subscription will push the confirmed state back automatically
    } finally {
      setPatching(false)
    }
  }, [matchId])

  return { match, liveState, status, loading, patch, patching }
}