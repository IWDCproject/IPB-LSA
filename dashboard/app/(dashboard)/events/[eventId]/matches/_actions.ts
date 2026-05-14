// app/(dashboard)/events/[eventId]/matches/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import {
  createItem,
  createItems,
  updateItem,
  deleteItems,
  readItems,
  readItem
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { adminDirectus } from '@/lib/directus-admin'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { pingWebRevalidate } from '@/lib/revalidate'

// --- Strict Runtime Payload Validation ---
const MatchPayloadSchema = z.object({
  eventSlug: z.string().min(1, 'Event slug is required for cache invalidation'),
  competition_category_id: z.string().uuid('Invalid Category ID'),
  match_name: z.string().trim().max(255).nullish().transform(val => val === '' ? null : val),
  round: z.string().trim().max(255).nullish().transform(val => val === '' ? null : val),
  venue: z.string().trim().max(255).nullish().transform(val => val === '' ? null : val),
  scheduled_at: z.string().datetime({ offset: true }).nullish().transform(val => val === '' ? null : val),
  home_participant_id: z.string().uuid().nullish().transform(val => val === '' ? null : val),
  away_participant_id: z.string().uuid().nullish().transform(val => val === '' ? null : val),
  participant_ids: z.array(z.string().uuid()).optional(),
})
.strip()
.refine(data => {
  if (data.home_participant_id && data.away_participant_id) {
    return data.home_participant_id !== data.away_participant_id
  }
  return true
}, { message: "Home and Away participants cannot be the same", path: ["away_participant_id"] })
.refine(data => {
  if (data.participant_ids && data.participant_ids.length > 0) {
    return new Set(data.participant_ids).size === data.participant_ids.length
  }
  return true
}, { message: "Open match participants must be unique", path: ["participant_ids"] })
.refine(data => {
  const hasHeadToHead = !!data.home_participant_id || !!data.away_participant_id;
  const hasOpen = !!data.participant_ids && data.participant_ids.length > 0;
  return !(hasHeadToHead && hasOpen);
}, { message: "Cannot mix Head-to-Head and Open participants" })

export type MatchActionPayload = z.input<typeof MatchPayloadSchema>

const OPERATOR_ROLES = ['SuperAdmin', 'Administrator', 'PJ Ormawa'] as const
type OperatorRole = typeof OPERATOR_ROLES[number]

function isOperator(role: string | undefined): role is OperatorRole {
  return OPERATOR_ROLES.includes(role as OperatorRole)
}

export async function createMatchAction(payload: MatchActionPayload) {
  const session = await auth()
  if (!session || !isOperator(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = MatchPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const { eventSlug, participant_ids, ...matchData } = parsed.data

  try {
    // 1. Authorization: Verify Category Ownership
    if (session.user.role === 'PJ Ormawa') {
      const category = await adminDirectus.request(
        readItem('competition_categories', matchData.competition_category_id, {
          fields: ['event_id.user_created']
        })
      ) as any
      if (category?.event_id?.user_created !== session.user.directusId) {
        return { success: false, error: 'Forbidden: You do not own this category' }
      }
    }

    // 2. Data Integrity: Validate Participants
    const allIdsToCheck = [
      ...(participant_ids ?? []),
      matchData.home_participant_id,
      matchData.away_participant_id,
    ].filter(Boolean) as string[]

    if (allIdsToCheck.length > 0) {
      const uniqueIds = Array.from(new Set(allIdsToCheck))
      const participants = await adminDirectus.request(
        readItems('participants', {
          filter: { id: { _in: uniqueIds } },
          fields: ['id', 'competition_category_id']
        })
      ) as any[]
      const allValid = participants.every(
        p => p.competition_category_id === matchData.competition_category_id
      )
      if (!allValid || participants.length !== uniqueIds.length) {
        return { success: false, error: 'Invalid participants for this category' }
      }
    }

    // 3. Create Match
    const match = await adminDirectus.request(
      createItem('matches', { ...matchData, status: 'upcoming', live_state: {} })
    )

    // 4. Junction Table
    if (participant_ids && participant_ids.length > 0) {
      await adminDirectus.request(
        createItems('match_participants', participant_ids.map((pid, idx) => ({
          match_id: match.id,
          participant_id: pid,
          position: idx + 1,
        })))
      )
    }

    revalidatePath(`/events/${eventSlug}/matches`, 'page')

    // Fetch the event ID for logging
    const event = await adminDirectus.request(
      readItems('events', {
        filter: { slug: { _eq: eventSlug } },
        fields: ['id'],
        limit: 1
      })
    ) as any[]
    const eventId = event[0]?.id

    await logActivity({
      action: 'create_match',
      entity: 'matches',
      entityId: match.id,
      description: `Membuat pertandingan "${matchData.match_name || 'Match'}" di kategori ${matchData.competition_category_id}`,
      eventId: eventId || null,
    })

    await pingWebRevalidate({ slug: eventSlug })
    return { success: true }
  } catch (error) {
    console.error('[createMatchAction]', error)
    return { success: false, error: 'Failed to create match' }
  }
}

export async function updateMatchAction(matchId: string, payload: MatchActionPayload) {
  const session = await auth()
  if (!session || !isOperator(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const matchIdValid = z.string().uuid().safeParse(matchId)
  if (!matchIdValid.success) return { success: false, error: 'Invalid Match ID' }

  const parsed = MatchPayloadSchema.safeParse(payload)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }

  const { eventSlug, participant_ids, ...matchData } = parsed.data

  try {
    // 1. Fetch existing match + open participants in parallel
    const [existingMatch, existingJunctions] = await Promise.all([
      adminDirectus.request(
        readItem('matches', matchId, {
          fields: [
            'status',
            'home_participant_id',
            'away_participant_id',
            'competition_category_id.event_id.id',
            'competition_category_id.event_id.user_created',
          ]
        })
      ) as Promise<any>,
      adminDirectus.request(
        readItems('match_participants', {
          filter: { match_id: { _eq: matchId } },
          fields: ['id', 'participant_id'],
          sort: ['position'],
        })
      ) as Promise<{ id: string; participant_id: string }[]>,
    ])

    const existingOwner = existingMatch?.competition_category_id?.event_id?.user_created
    if (session.user.role === 'PJ Ormawa' && existingOwner !== session.user.directusId) {
      return { success: false, error: 'Forbidden' }
    }

    // 2. State Lock: only block if participants actually changed
    if (existingMatch.status !== 'upcoming') {
      const existingOpenIds = existingJunctions.map((j) => j.participant_id).sort()
      const incomingOpenIds = [...(participant_ids ?? [])].sort()
      const openChanged = participant_ids !== undefined &&
        JSON.stringify(incomingOpenIds) !== JSON.stringify(existingOpenIds)

      const homeChanged = matchData.home_participant_id !== undefined &&
        matchData.home_participant_id !== (existingMatch.home_participant_id ?? null)
      const awayChanged = matchData.away_participant_id !== undefined &&
        matchData.away_participant_id !== (existingMatch.away_participant_id ?? null)

      if (openChanged || homeChanged || awayChanged) {
        return { success: false, error: 'Cannot change participants once a match has started' }
      }
    }

    // 3. Update Match
    await adminDirectus.request(updateItem('matches', matchId, matchData))

    // 4. Reconcile Open Participants
    if (participant_ids !== undefined) {
      if (existingJunctions.length > 0) {
        await adminDirectus.request(
          deleteItems('match_participants', existingJunctions.map(j => j.id))
        )
      }
      if (participant_ids.length > 0) {
        await adminDirectus.request(
          createItems('match_participants', participant_ids.map((pid, idx) => ({
            match_id: matchId,
            participant_id: pid,
            position: idx + 1,
          })))
        )
      }
    }

    revalidatePath(`/events/${eventSlug}/matches`, 'page')

    const eventId = existingMatch?.competition_category_id?.event_id?.id

    await logActivity({
      action: 'update_match',
      entity: 'matches',
      entityId: matchId,
      description: `Memperbarui detail pertandingan "${matchData.match_name || 'Match'}" (Meta: Venue/Schedule/Participants)`,
      eventId: eventId || null,
    })

    await pingWebRevalidate({ slug: eventSlug })
    return { success: true }
  } catch (error) {
    console.error('[updateMatchAction]', error)
    return { success: false, error: 'Update failed' }
  }
}