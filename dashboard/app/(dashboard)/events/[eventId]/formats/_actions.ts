// app/(dashboard)/events/[eventId]/formats/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { 
  createDirectus, 
  rest, 
  staticToken, 
  createItem, 
  updateItem, 
  deleteItem, 
  readItem, 
  readItems 
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Zod Runtime Validation Schemas ----------------------------

const MatchTypeSchema = z.enum(['head_to_head', 'solo', 'open'])
const ParticipantTypeSchema = z.enum(['individual', 'team'])

const FormatModuleSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.any()),
})

// Validation: We allow event_id as a string (it might be the slug from the URL)
const MatchFormatSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  event_id: z.string().min(1, "Event ID/Slug is required"), 
  name: z.string().min(1, "Name is required"),
  match_type: MatchTypeSchema,
  modules: z.array(FormatModuleSchema).min(1, "At least one engine module is required"),
})

const CategorySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  event_id: z.string().min(1, "Event ID/Slug is required"),
  name: z.string().min(1, "Name is required"),
  participant_type: ParticipantTypeSchema,
  format_id: z.string().uuid().nullable().optional(),
  display_order: z.number().default(0),
})

// --- The Resolver (Fixes your Slug Error) -----------------------

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
    }))
  } else {
    // If it's a slug (e.g., 'ipb-futsal-2026'), find the record by slug
    const results = await adminDirectus.request(readItems('events', {
      filter: { slug: { _eq: identifier } },
      fields: ['id', 'user_created', 'slug'],
      limit: 1
    }))
    event = results[0]
  }

  if (!event) throw new Error('Event not found')

  // Ownership Guard (Prevent IDOR)
  if (role !== 'SuperAdmin' && role !== 'Administrator') {
    if (event.user_created !== userId) {
      throw new Error('Forbidden: You do not own this event')
    }
  }

  return { eventId: event.id, eventSlug: event.slug, session }
}

// --- Actions ---------------------------------------------------

export async function upsertFormatAction(rawPayload: unknown) {
  try {
    const parsed = MatchFormatSchema.safeParse(rawPayload)
    if (!parsed.success) {
      return { success: false, error: 'Data format tidak valid.' }
    }
    
    const data = parsed.data
    // 1. Convert the Slug in URL to the UUID in Database
    const { eventId, eventSlug, session } = await resolveAndVerifyEvent(data.event_id)

    if (data.id) {
      // 2. IDOR check: Ensure this format actually belongs to the event we just verified
      const existing = await adminDirectus.request(readItem('match_formats', data.id, { fields: ['event_id'] }))
      if (existing.event_id !== eventId) throw new Error('Forbidden: Ownership mismatch')

      await adminDirectus.request(updateItem('match_formats', data.id, {
        name: data.name,
        match_type: data.match_type,
        modules: data.modules
      }))
    } else {
      // 3. Create new format using the resolved UUID
      const { id, ...createData } = data
      await adminDirectus.request(createItem('match_formats', {
        ...createData,
        event_id: eventId, 
        created_by: session.user.directusId 
      }))
    }
    
    // 4. Instant Cache Update
    revalidatePath(`/events/${eventSlug}/formats`)
    return { success: true }
  } catch (error: any) {
    console.error("[upsertFormatAction]", error)
    return { success: false, error: error.message || 'Gagal menyimpan format.' }
  }
}

export async function upsertCategoryAction(rawPayload: unknown) {
  try {
    const parsed = CategorySchema.safeParse(rawPayload)
    if (!parsed.success) return { success: false, error: 'Data kategori tidak valid.' }
    
    const data = parsed.data
    const { eventId, eventSlug } = await resolveAndVerifyEvent(data.event_id)

    if (data.id) {
      const existing = await adminDirectus.request(readItem('competition_categories', data.id, { fields: ['event_id'] }))
      if (existing.event_id !== eventId) throw new Error('Forbidden: Ownership mismatch')

      await adminDirectus.request(updateItem('competition_categories', data.id, {
        name: data.name,
        participant_type: data.participant_type,
        format_id: data.format_id,
        display_order: data.display_order
      }))
    } else {
      const { id, ...createData } = data
      await adminDirectus.request(createItem('competition_categories', {
        ...createData,
        event_id: eventId
      }))
    }

    revalidatePath(`/events/${eventSlug}/formats`)
    return { success: true }
  } catch (error: any) {
    console.error("[upsertCategoryAction]", error)
    return { success: false, error: error.message || 'Gagal menyimpan kategori' }
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'SuperAdmin' && session.user.role !== 'Administrator')) {
      return { success: false, error: 'Hanya Admin yang dapat menghapus kategori.' }
    }

    // Fetch the slug before deleting so we can clear the cache
    const category = await adminDirectus.request(
      readItem('competition_categories', id, { fields: ['event_id.slug'] })
    ) as any

    await adminDirectus.request(deleteItem('competition_categories', id))
    
    if (category?.event_id?.slug) {
      revalidatePath(`/events/${category.event_id.slug}/formats`)
    }
    return { success: true }
  } catch (error: any) {
    console.error("[deleteCategoryAction]", error)
    return { success: false, error: 'Gagal menghapus kategori' }
  }
}