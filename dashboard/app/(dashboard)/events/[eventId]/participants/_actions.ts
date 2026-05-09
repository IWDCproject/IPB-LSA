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
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Directus admin client
// ---------------------------------------------------------------------------

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`${label} bukan UUID yang valid.`)
  }
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_LOGO_BYTES = 5 * 1024 * 1024 // 5 MB

function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, atau GIF.`)
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
): Promise<void> {
  if (role === 'SuperAdmin') return

  const event = await adminDirectus.request(
    readItem('events', eventId, { fields: ['user_created'] }),
  )

  if (event.user_created !== directusId) {
    throw new Error('Forbidden: Anda tidak punya akses ke event ini.')
  }
}

/**
 * Fetches a competition category and returns its event_id.
 * Also asserts the caller has access to that event.
 */
async function assertCategoryAccess(
  categoryId: string,
  directusId: string,
  role: string,
): Promise<string> {
  assertUUID(categoryId, 'competition_category_id')

  const category = await adminDirectus.request(
    readItem('competition_categories', categoryId, { fields: ['event_id'] }),
  )

  const eventId: string = category.event_id
  await assertEventAccess(eventId, directusId, role)
  return eventId
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

  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa') {
    return { success: false, error: `Forbidden: Role anda (${role}) tidak punya akses.` }
  }

  try {
    // Verify the target category exists and the caller owns its event.
    await assertCategoryAccess(
      payload.competition_category_id as string,
      directusId,
      role,
    )

    // Only write known-safe fields - prevents mass assignment.
    const safePayload = pickFields(payload, PARTICIPANT_CREATE_ALLOWED)

    await adminDirectus.request(createItem('participants', safePayload))
    revalidatePath(`/events/[eventId]/participants`, 'page')
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

  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa') {
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

    await assertCategoryAccess(existing.competition_category_id, directusId, role)

    // Only write known-safe fields - prevents mass assignment.
    const safePayload = pickFields(payload, PARTICIPANT_UPDATE_ALLOWED)

    await adminDirectus.request(updateItem('participants', participantId, safePayload))
    revalidatePath(`/events/[eventId]/participants`, 'page')
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

  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const name    = formData.get('name')    as string
    const eventId = formData.get('eventId') as string
    const color   = formData.get('color')   as string
    const logoFile = formData.get('logo')   as File | null

    assertUUID(eventId, 'eventId')

    // Verify the caller owns this event before creating anything under it.
    await assertEventAccess(eventId, directusId, role)

    let logoId: string | null = null

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile)
      const uploadFormData = new FormData()
      uploadFormData.append('file', logoFile)
      const uploadedFile = await adminDirectus.request(uploadFiles(uploadFormData))
      logoId = uploadedFile.id
    }

    await adminDirectus.request(
      createItem('institutions', {
        event_id: eventId,
        name,
        logo: logoId,
        color: color || null,
      }),
    )

    revalidatePath(`/events/[eventId]/participants`, 'page')
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

    // Fetch the institution to resolve its event - IDOR guard.
    const institution = await adminDirectus.request(
      readItem('institutions', institutionId, { fields: ['event_id'] }),
    )

    await assertEventAccess(institution.event_id, directusId, role)

    let logoId: string | undefined = undefined

    if (logoFile && logoFile.size > 0) {
      validateImageFile(logoFile)
      const uploadFormData = new FormData()
      uploadFormData.append('file', logoFile)
      const uploadedFile = await adminDirectus.request(uploadFiles(uploadFormData))
      logoId = uploadedFile.id
    }

    const updateData: Record<string, unknown> = { name, color: color || null }
    if (logoId !== undefined) updateData.logo = logoId

    await adminDirectus.request(updateItem('institutions', institutionId, updateData))

    revalidatePath(`/events/[eventId]/participants`, 'page')
    return { success: true }
  } catch (error: any) {
    console.error('updateInstitutionAction error:', error?.message ?? error)
    return { success: false, error: error?.message ?? 'Gagal memperbarui institusi' }
  }
}