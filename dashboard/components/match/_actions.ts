'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  createDirectus, rest, staticToken,
  readItem, updateItem,
} from '@directus/sdk'
import type { LiveState, MatchFormat, Participant } from '@/types/directus'

// --- Admin client (bypasses row-level permissions) -------------

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Auth guard ------------------------------------------------

async function requireOperator() {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  const role = session.user.role
  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa' && role !== 'Administrator') {
    throw new Error('Forbidden')
  }
  return session
}

// --- Actions ---------------------------------------------------

export async function getMatchControlDataAction(matchId: string) {
  const session = await auth()
  if (!session) return { success: false as const, error: 'Unauthorized' }

  try {
    const match = await adminDirectus.request(
      readItem('matches', matchId, {
        fields:[
          'id', 'match_name', 'round', 'status',
          'live_state',
          'format_id.*',
          'category_id.name',
          'event_id',
          'home_participant_id.*',
          'away_participant_id.*',
          'participants.participant_id.*',
        ],
      })
    ) as any

    return { success: true as const, match }
  } catch (error: any) {
    console.error('[getMatchControlDataAction]', error)
    return { success: false as const, error: 'Gagal memuat data pertandingan.' }
  }
}

export async function patchLiveStateAction(
  matchId:  string,
  partial:  Partial<LiveState>,
) {
  try {
    await requireOperator()
  } catch (e: any) {
    return { success: false as const, error: e.message }
  }

  try {
    const current = await adminDirectus.request(
      readItem('matches', matchId, { fields:['live_state'] })
    ) as { live_state: LiveState }

    const merged: LiveState = {
      ...(current.live_state ?? {}),
      ...partial,
    }

    // Intercept relevant top-level data to sync DB fields automatically
    const payload: any = { live_state: merged }

    // Sync Winner
    if (partial.winner !== undefined) {
      // Prevents FK DB errors when Directus expects UUIDs instead of 'draw'
      payload.winner = partial.winner === 'draw' ? null : partial.winner
    }
    
    // Sync Rankings (Open/Solo matches)
    if (partial.rankings !== undefined) {
      payload.rankings = partial.rankings
    }

    await adminDirectus.request(
      updateItem('matches', matchId, payload)
    )

    // FORCE Next.js Cache Purge
    revalidatePath(`/events/[id]/matches/${matchId}/control`, 'page')

    return { success: true as const, liveState: merged }
  } catch (error: any) {
    console.error('[patchLiveStateAction]', error)
    return { success: false as const, error: 'Gagal menyimpan live state.' }
  }
}

export async function setMatchStatusAction(
  matchId: string,
  status:  'upcoming' | 'live' | 'finished',
  liveStatePartial?: Partial<LiveState>,
) {
  try {
    await requireOperator()
  } catch (e: any) {
    return { success: false as const, error: e.message }
  }

  try {
    const current = await adminDirectus.request(
      readItem('matches', matchId, { fields:['live_state'] })
    ) as { live_state: LiveState }

    const merged: LiveState = {
      ...(current.live_state ?? {}),
      ...(liveStatePartial ?? {}),
      matchStatus: status,
    }

    const payload: any = {
      status,
      live_state: merged,
    }

    // Capture the final winner/rankings when completing the match
    if (merged.winner !== undefined) {
      payload.winner = merged.winner === 'draw' ? null : merged.winner
    }
    if (merged.rankings !== undefined) {
      payload.rankings = merged.rankings
    }

    await adminDirectus.request(
      updateItem('matches', matchId, payload)
    )

    // FORCE Next.js Cache Purge
    revalidatePath(`/events/[id]/matches/${matchId}/control`, 'page')

    return { success: true as const, liveState: merged }
  } catch (error: any) {
    console.error('[setMatchStatusAction]', error)
    return { success: false as const, error: 'Gagal mengubah status pertandingan.' }
  }
}