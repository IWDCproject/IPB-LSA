'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  createDirectus,
  rest,
  staticToken,
  readItem,
  updateItem,
} from '@directus/sdk'
import { z } from 'zod'
import type { LiveState } from '@/types/directus'
import { DEFAULT_LIVE_STATE } from '@/lib/liveStateDefaults'
import { pingWebRevalidate } from '@/lib/revalidate'

// --- Zod Runtime Validation Schemas ----------------------------

const MatchStatusSchema = z.enum(['upcoming', 'live', 'finished', 'cancelled'])

const SetLogEntrySchema = z.object({
  set: z.number(),
  homeScore: z.number(),
  awayScore: z.number(),
  winner: z.enum(['home', 'away']),
})

const TimeLogEntrySchema = z.object({
  id: z.string().max(36).optional(),
  rank: z.number().optional(),
  name: z.string().max(100),
  time: z.string().max(50),
})

const LiveStatePatchSchema = z.object({
  matchStatus: MatchStatusSchema.optional(),
  winner: z.string().max(36).nullable().optional(),
  rankings: z
    .array(z.object({ rank: z.number(), id: z.string().max(36), name: z.string().max(100) }))
    .nullable()
    .optional(),
  notes: z.string().max(500).optional(),
  timerSecs: z.number().optional(),
  timerTarget: z.string().max(30).nullable().optional(),
  timerLastStarted: z.string().max(30).nullable().optional(),
  timerRunning: z.boolean().optional(),
  timerFlags: z.array(z.object({ label: z.string().max(50), secs: z.number() })).optional(),
  homeScore: z.number().optional(),
  awayScore: z.number().optional(),
  periodIdx: z.number().optional(),
  periodPhase: z.enum(['idle', 'active', 'halftime']).optional(),
  setIdx: z.number().optional(),
  setPhase: z.enum(['idle', 'active', 'ending']).optional(),
  setScore: z.tuple([z.number(), z.number()]).optional(),
  setsWon: z.tuple([z.number(), z.number()]).optional(),
  setLog: z.array(SetLogEntrySchema).optional(),
  pendingSetWinner: z.string().max(36).nullable().optional(),
  judgeScores: z.array(z.number()).optional(),
  timeLog: z.array(TimeLogEntrySchema).optional(),
}).strict()

// --- Admin client ----------------------------------------------
//
// FIX: was a module-level singleton — if env vars are missing, the error
// throws at import time (before any action runs), producing a confusing
// "module failed to load" crash rather than a clear env-var message.
// Moved to a factory called inside each action so the error surface is clean.
//
// FIX (SECURITY): was process.env.NEXT_PUBLIC_DIRECTUS_URL which causes
// Next.js to inline the value into every client-side JS bundle, leaking the
// internal Directus URL to all browser visitors. Server actions run only on
// the server; the env var must use a server-only name (no NEXT_PUBLIC_ prefix).

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

function createAdminClient() {
  return createDirectus(requireEnv('DIRECTUS_URL'))
    .with(staticToken(requireEnv('DIRECTUS_STATIC_TOKEN')))
    .with(rest())
}

// --- Helpers ---------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`${label} bukan UUID yang valid.`)
  }
}

// FIX (CRASH): Directus may return a `json` column as a parsed object OR as a
// raw JSON string depending on the column type and SDK version. Spreading a
// string with `...someString` does NOT give you the parsed object — JS spreads
// the string's character indices: `{ '0': '{', '1': '"', ... }`. That
// corrupted object is then written back to Directus, which may reject it or
// store garbage, manifesting as "cannot get array length of a scalar" when
// Directus tries to process the malformed payload.
function parseLiveState(raw: unknown): Partial<LiveState> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Partial<LiveState> } catch { return {} }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<LiveState>
  }
  return {}
}

function safeError(context: string, error: unknown): string {
  console.error(`[${context}]`, error)
  if (error instanceof Error) {
    if (
      error.message === 'Unauthorized' ||
      error.message === 'Forbidden: Insufficient privileges' ||
      error.message.endsWith('bukan UUID yang valid.')
    ) {
      return error.message
    }
  }
  return 'Terjadi kesalahan server. Silakan coba lagi.'
}

// --- Auth & Ownership Guards -----------------------------------

async function requireOperator() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = session.user.role
  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa' && role !== 'Administrator') {
    throw new Error('Forbidden: Insufficient privileges')
  }
  return session
}

async function verifyMatchOwnership(matchId: string) {
  const session = await requireOperator()
  const userRole = session.user.role

  if (userRole === 'SuperAdmin' || userRole === 'Administrator') return session

  const adminDirectus = createAdminClient()
  const match = await adminDirectus.request(
    readItem('matches', matchId, {
      fields: ['competition_category_id.event_id.user_created'],
    })
  ) as any

  const ownerId: string | undefined = match?.competition_category_id?.event_id?.user_created

  if (!ownerId) throw new Error('Forbidden: Insufficient privileges')

  if (ownerId !== session.user.directusId) {
    throw new Error('Forbidden: Insufficient privileges')
  }

  return session
}

// --- Actions ---------------------------------------------------

export async function getMatchControlDataAction(matchId: string) {
  try {
    // FIX: validate UUID *before* any DB call. Was missing entirely — any
    // string (including SQL fragments) was passed straight to Directus.
    assertUUID(matchId, 'matchId')

    // FIX (SECURITY): was requireOperator() only, meaning any logged-in
    // PJ Ormawa could read the control data for any match in any event,
    // not just their own. Changed to verifyMatchOwnership for consistency.
    await verifyMatchOwnership(matchId)

    const adminDirectus = createAdminClient()
    const match = await adminDirectus.request(
      readItem('matches', matchId, {
        fields: [
          'id', 'match_name', 'round', 'status',
          'live_state',
          'competition_category_id.name',
          'competition_category_id.format_id.*',
          'competition_category_id.event_id',
          'home_participant_id.*',
          'away_participant_id.*',
          'match_participants.participant_id.*',
        ],
      })
    ) as any

    return { success: true as const, match }
  } catch (error) {
    return { success: false as const, error: safeError('getMatchControlDataAction', error) }
  }
}

export async function patchLiveStateAction(matchId: string, rawPartial: Partial<LiveState>) {
  try {
    // FIX (SECURITY): assertUUID was called *after* verifyMatchOwnership,
    // which itself calls readItem with the unvalidated matchId. The UUID
    // check must come first so no DB call ever receives unvalidated input.
    assertUUID(matchId, 'matchId')

    await verifyMatchOwnership(matchId)

    const parsed = LiveStatePatchSchema.safeParse(rawPartial)
    if (!parsed.success) throw new Error('Invalid payload data')

    const partial = parsed.data as Partial<LiveState>

    const adminDirectus = createAdminClient()
    const current = await adminDirectus.request(
      readItem('matches', matchId, {
        fields: ['live_state', 'competition_category_id.event_id'],
      })
    ) as any

    // NOTE - TOCTOU race condition: this is a read-modify-write with no locking.
    // Two concurrent updates will silently overwrite each other (last write wins).
    // Acceptable for single-operator matches; use atomic JSONB merging if that changes.
    const merged: LiveState = {
      ...DEFAULT_LIVE_STATE,
      ...parseLiveState(current.live_state),  // FIX: safe parse (see parseLiveState)
      ...partial,
    }

    await adminDirectus.request(updateItem('matches', matchId, { live_state: merged }))

    // FIX: eventId could be undefined if the relation wasn't expanded correctly
    // (e.g. competition_category_id returned as a raw UUID string). Guard before
    // calling revalidatePath to avoid caching a path like /events/undefined/...
    const eventId: string | undefined = current?.competition_category_id?.event_id
    if (eventId) {
      revalidatePath(`/events/${eventId}/matches/${matchId}/control`)
    }

    return { success: true as const, liveState: merged }
  } catch (error) {
    return { success: false as const, error: safeError('patchLiveStateAction', error) }
  }
}

export async function setMatchStatusAction(
  matchId: string,
  rawStatus: 'upcoming' | 'live' | 'finished' | 'cancelled',
  rawLiveStatePartial?: Partial<LiveState>,
) {
  try {
    // FIX (SECURITY): same assertUUID ordering bug as patchLiveStateAction.
    assertUUID(matchId, 'matchId')

    await verifyMatchOwnership(matchId)

    const statusParsed = MatchStatusSchema.safeParse(rawStatus)
    if (!statusParsed.success) throw new Error('Invalid match status')

    let partial: Partial<LiveState> = {}
    if (rawLiveStatePartial) {
      const stateParsed = LiveStatePatchSchema.safeParse(rawLiveStatePartial)
      if (!stateParsed.success) throw new Error('Invalid live state payload')
      partial = stateParsed.data as Partial<LiveState>
    }

    const status = statusParsed.data

    const adminDirectus = createAdminClient()
    const current = await adminDirectus.request(
      readItem('matches', matchId, {
        fields: ['live_state', 'competition_category_id.event_id'],
      })
    ) as any

    const merged: LiveState = {
      ...DEFAULT_LIVE_STATE,
      ...parseLiveState(current.live_state),  // FIX: safe parse (see parseLiveState)
      ...partial,
      matchStatus: status,
    }

    await adminDirectus.request(updateItem('matches', matchId, { status, live_state: merged }))

    // FIX: same undefined eventId guard as patchLiveStateAction.
    const event = current?.competition_category_id?.event_id
    if (event?.id) {
      revalidatePath(`/events/${event.id}/matches/${matchId}/control`)
    }
    if (event?.slug) {
      await pingWebRevalidate({ slug: event.slug })
    }

    return { success: true as const, liveState: merged }
  } catch (error) {
    return { success: false as const, error: safeError('setMatchStatusAction', error) }
  }
}