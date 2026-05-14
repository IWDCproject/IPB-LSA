// app/(dashboard)/events/[eventId]/participants/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import {
  createDirectus,
  rest,
  staticToken,
  createItem,
  updateItem,
  uploadFiles,
  readItem,
  readItems,
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { pingWebRevalidate } from '@/lib/revalidate'

import { adminDirectus } from '@/lib/directus-admin'
import { logActivity } from '@/lib/activity'
import { ROLES } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`${label} bukan UUID yang valid.`)
  }
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5 MB

function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, atau WebP.`)
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`Ukuran file terlalu besar (maks 5 MB).`)
  }
}

// ---------------------------------------------------------------------------
// Ownership / access helpers
// ---------------------------------------------------------------------------

/**
 * Throws if a PJ Ormawa does not own the given event.
 * SuperAdmin may access any event.
 */
async function assertEventAccess(
  eventId: string,
  directusId: string,
  role: string,
): Promise<{ id: string; slug: string }> {
  const event = await adminDirectus.request(
    readItem('events', eventId, { fields: ['id', 'slug', 'user_created'] }),
  ) as any

  if (role !== ROLES.SUPER_ADMIN && event.user_created !== directusId) {
    throw new Error('Forbidden: Anda tidak punya akses ke event ini.')
  }
  return event
}

/**
 * Checks if the identifier is a UUID or a Slug.
 * Finds the real UUID in the DB and verifies the user owns the event.
 */
async function resolveAndVerifyEvent(identifier: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  
  const role = session.user.role
  const userId = session.user.directusId
  
  // Regex to check if the identifier is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)

  let event;

  if (isUUID) {
    // If it's already a UUID, just fetch it to check ownership
    event = await adminDirectus.request(readItem('events', identifier, { 
      fields: ['id', 'user_created', 'slug'] 
    })) as any
  } else {
    // If it's a slug (e.g., 'ipb-futsal-2026'), find the record by slug
    const results = await adminDirectus.request(readItems('events', {
      filter: { slug: { _eq: identifier } },
      fields: ['id', 'user_created', 'slug'],
      limit: 1
    })) as any
    event = results[0]
  }

  if (!event) throw new Error('Event not found')

  // Ownership Guard (Prevent IDOR)
  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMINISTRATOR && role !== ROLES.OPERATOR) {
    if (event.user_created !== userId) {
      throw new Error('Forbidden: You do not own this event')
    }
  }

  return { eventId: event.id, eventSlug: event.slug, session }
}

/**
 * Fetches a competition category and returns its event_id.
 * Also asserts the caller has access to that event.
 */
async function assertCategoryAccess(
  categoryId: string,
  directusId: string,
  role: string,
): Promise<{ id: string; slug: string }> {
  assertUUID(categoryId, 'competition_category_id')

  const category = await adminDirectus.request(
    readItem('competition_categories', categoryId, { fields: ['event_id.id', 'event_id.slug'] }),
  ) as any

  const event = category.event_id
  await assertEventAccess(event.id, directusId, role)
  return event
}

// ---------------------------------------------------------------------------
// Field whitelists
// ---------------------------------------------------------------------------

const PARTICIPANT_CREATE_ALLOWED = new Set([
  'competition_category_id',
  'institution_id',
  'name',
  'members',   // required for team participants - must not be stripped
  'seed',
  'notes',
])

const PARTICIPANT_UPDATE_ALLOWED = new Set([
  'institution_id',
  'name',
  'members',   // required for team participants - must not be stripped
  'seed',
  'notes',
])

function pickFields(
  payload: Record<string, unknown>,
  allowed: Set<string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => allowed.has(k)),
  )
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createParticipantAction(payload: Record<string, unknown>) {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'Unauthorized: Silakan login kembali.' }
  }

  const { role, directusId } = session.user

  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.OPERATOR) {
    return { success: false, error: `Forbidden: Role anda (${role}) tidak punya akses.` }
  }

  try {
    const event = await assertCategoryAccess(
      payload.competition_category_id as string,
      directusId,
      role,
    )

    // Only write known-safe fields - prevents mass assignment.
    const safePayload = pickFields(payload, PARTICIPANT_CREATE_ALLOWED)

    await adminDirectus.request(createItem('participants', safePayload))
    revalidatePath(`/events/${event.id}/participants`, 'page')
    await pingWebRevalidate({ slug: event.slug })
    await logActivity({
      action: 'create_participant',
      entity: 'participants',
      description: `Menambah partisipan "${payload.name}" ke kategori ${payload.competition_category_id}`,
      eventId: event.id,
    })

    return { success: true }
  } catch (error: any) {
    console.error('createParticipantAction error:', error?.message ?? error)
    return {
      success: false,
      error: error?.errors?.[0]?.message ?? error?.message ?? 'Gagal menyimpan ke database.',
    }
  }
}

export async function updateParticipantAction(
  participantId: string,
  payload: Record<string, unknown>,
) {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'Unauthorized: Silakan login kembali.' }
  }

  const { role, directusId } = session.user

  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.OPERATOR) {
    return { success: false, error: `Forbidden: Role anda (${role}) tidak punya akses.` }
  }

  try {
    assertUUID(participantId, 'participantId')

    // Fetch the existing participant to resolve its event - IDOR guard.
    const existing = await adminDirectus.request(
      readItem('participants', participantId, {
        fields: ['competition_category_id'],
      }),
    )

    const event = await assertCategoryAccess(existing.competition_category_id, directusId, role)

    // Only write known-safe fields - prevents mass assignment.
    const safePayload = pickFields(payload, PARTICIPANT_UPDATE_ALLOWED)

    await adminDirectus.request(updateItem('participants', participantId, safePayload))
    revalidatePath(`/events/${event.id}/participants`, 'page')
    await pingWebRevalidate({ slug: event.slug })
    await logActivity({
      action: 'update_participant',
      entity: 'participants',
      entityId: participantId,
      description: `Memperbarui partisipan "${payload.name || participantId}"`,
      eventId: event.id,
    })

    return { success: true }
  } catch (error: any) {
    console.error('updateParticipantAction error:', error?.message ?? error)
    return {
      success: false,
      error: error?.errors?.[0]?.message ?? error?.message ?? 'Gagal memperbarui data.',
    }
  }
}

export async function createInstitutionAction(formData: FormData) {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { role, directusId } = session.user

  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.OPERATOR) {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const name    = formData.get('name')    as string
    const eventId = formData.get('eventId') as string
    const color   = formData.get('color')   as string
    const logoFile = formData.get('logo')   as File | null

    assertUUID(eventId, 'eventId')

    const event = await assertEventAccess(eventId, directusId, role)

    let logoId: string | null = null

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile)
      const uploadFormData = new FormData()
      uploadFormData.append('file', logoFile)
      const uploadedFile = await adminDirectus.request(uploadFiles(uploadFormData)) as any
      logoId = uploadedFile.id
    }

    await adminDirectus.request(
      createItem('institutions', {
        event_id: event.id,
        name,
        logo: logoId,
      }),
    )

    revalidatePath(`/events/${event.id}/participants`, 'page')
    await pingWebRevalidate({ slug: event.slug })
    await logActivity({
      action: 'create_institution',
      entity: 'institutions',
      description: `Menambah institusi "${name}"`,
      eventId: event.id,
    })

    return { success: true }
  } catch (error: any) {
    console.error('createInstitutionAction error:', error?.message ?? error)
    return { success: false, error: error?.message ?? 'Gagal menambah institusi' }
  }
}

export async function updateInstitutionAction(formData: FormData) {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { role, directusId } = session.user

  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const institutionId = formData.get('institutionId') as string
    const name          = formData.get('name')          as string
    const color         = formData.get('color')         as string
    const logoFile      = formData.get('logo')          as File | null

    assertUUID(institutionId, 'institutionId')

    const institution = await adminDirectus.request(
      readItem('institutions', institutionId, { fields: ['event_id'] }),
    ) as any

    const event = await assertEventAccess(institution.event_id, directusId, role)

    let logoId: string | undefined = undefined

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile)
      const uploadFormData = new FormData()
      uploadFormData.append('file', logoFile)
      const uploadedFile = await adminDirectus.request(uploadFiles(uploadFormData)) as any
      logoId = uploadedFile.id
    }

    const updateData: Record<string, unknown> = { name }
    if (logoId !== undefined) updateData.logo = logoId

    await adminDirectus.request(updateItem('institutions', institutionId, updateData))

    revalidatePath(`/events/${event.id}/participants`, 'page')
    await pingWebRevalidate({ slug: event.slug })
    await logActivity({
      action: 'update_institution',
      entity: 'institutions',
      entityId: institutionId,
      description: `Memperbarui institusi "${name}"`,
      eventId: event.id,
    })

    return { success: true }
  } catch (error: any) {
    console.error('updateInstitutionAction error:', error?.message ?? error)
    return { success: false, error: error?.message ?? 'Gagal memperbarui institusi' }
  }
}

// ---------------------------------------------------------------------------
// Query Actions
// ---------------------------------------------------------------------------

export async function getParticipantsDataAction(eventSlugOrId: string) {
  try {
    const { eventId } = await resolveAndVerifyEvent(eventSlugOrId)

    const [categories, rawParticipants, institutions] = await Promise.all([
      adminDirectus.request(
        readItems('competition_categories', {
          filter: { event_id: { _eq: eventId } },
          fields: ['id', 'name', 'display_order', 'format_id.name', 'format_id.match_type', 'event_id.id'] as any,
          sort: ['display_order'],
          limit: -1,
        })
      ),
      adminDirectus.request(
        readItems('participants', {
          filter: { competition_category_id: { event_id: { _eq: eventId } } },
          fields: ['id', 'name', 'competition_category_id', 'institution_id.id', 'institution_id.name', 'institution_id.logo', 'members', 'seed', 'notes'] as any,
          limit: -1,
        })
      ),
      adminDirectus.request(
        readItems('institutions', {
          filter: { event_id: { _eq: eventId } },
          fields: ['id', 'name', 'logo'],
          limit: -1,
        })
      ),
    ])

    return {
      success: true,
      data: {
        categories: categories as any[],
        participants: rawParticipants as any[],
        institutions: institutions as any[],
        eventId: eventId
      }
    }
  } catch (error: any) {
    console.error('getParticipantsDataAction error:', error?.message ?? error)
    return { success: false, error: error?.message ?? 'Gagal memuat data.' }
  }
}