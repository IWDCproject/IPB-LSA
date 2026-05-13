// app/(dashboard)/events/[eventId]/settings/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { 
  createDirectus, rest, staticToken, 
  updateItem, deleteItem, createItem, 
  uploadFiles, readItem 
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Zod Schemas -----------------------------------------------

const EventStatusSchema = z.enum(['draft', 'upcoming', 'active', 'finished', 'cancelled'])
const EventTypeSchema = z.enum(['sport', 'arts'])

const EventUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  type: EventTypeSchema,
  is_published: z.boolean(),
  is_registration_open: z.boolean(),
  registration_url: z.string().nullable().optional(),
  guidebook_url: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
}).strict()

const PhaseSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  description: z.string().optional(),
  date_start: z.string(),
  time_start: z.string(),
  display_order: z.number().optional()
})

// --- Authorization Helper --------------------------------------

async function requireEventOwnership(eventId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  
  const role = session.user.role
  if (role !== 'SuperAdmin' && role !== 'PJ Ormawa' && role !== 'Administrator') {
    throw new Error('Forbidden')
  }

  if (role === 'SuperAdmin' || role === 'Administrator') return session

  try {
    const event = await adminDirectus.request(
      readItem('events', eventId, { fields: ['user_created'] })
    )
    if (event.user_created !== session.user.directusId) {
      throw new Error('Forbidden: You do not own this event')
    }
  } catch {
    throw new Error('Event not found or access denied')
  }

  return session
}

// --- Web App Revalidation Helper -------------------------------

async function pingWebRevalidate(slug?: string) {
  const webUrl = process.env.WEB_APP_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!webUrl || !secret) {
    console.warn('[revalidate] WEB_APP_URL or REVALIDATE_SECRET not set — web cache not busted')
    return
  }
  await fetch(`${webUrl}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': secret,
    },
    body: JSON.stringify({ slug }),
  }).catch(err => console.error('[revalidate] web app ping failed:', err.message))
}

// --- Cache Helper ----------------------------------------------

async function revalidateEventCache(eventId: string) {
  try {
    const event = await adminDirectus.request(readItem('events', eventId, { fields: ['slug'] }))
    if (event?.slug) {
      revalidatePath('/', 'layout')
      revalidatePath('/events')
      revalidatePath(`/events/${event.slug}`, 'layout')
      revalidatePath(`/events/${event.slug}/settings`, 'layout')
      await pingWebRevalidate(event.slug)
    }
  } catch (err) {
    console.error("Cache bust failed", err)
  }
}

// --- Image Validation Helper -----------------------------------

async function uploadValidImage(file: File | null) {
  if (!file || file.size === 0) return null;
  
  const allowedTypes =['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('Only JPG, PNG, and WEBP are allowed')
  if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit')

  const uf = new FormData(); 
  uf.append('file', file);
  const res = await adminDirectus.request(uploadFiles(uf));
  return res.id;
}

// --- Actions ---------------------------------------------------

export async function updateEventInfoAction(formData: FormData) {
  const eventId = formData.get('eventId') as string;
  if (!eventId) return { success: false, error: 'Event ID missing' }

  try {
    await requireEventOwnership(eventId)

    const rawData = {
      name: formData.get('name'),
      location: formData.get('location') || null,
      description: formData.get('description') || null,
      start_date: formData.get('start_date') || null,
      end_date: formData.get('end_date') || null,
      slug: formData.get('slug'),
      type: formData.get('type'),
      is_published: formData.get('is_published') === 'true',
      is_registration_open: formData.get('is_registration_open') === 'true',
      registration_url: formData.get('url_pendaftaran') || null,
      guidebook_url: formData.get('url_guidebook') || null,
      instagram_url: formData.get('instagram_url') || null,
      website_url: formData.get('website_url') || null,
    }

    const parsed = EventUpdateSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: 'Invalid data submitted' }

    const contactPersonJson = {
      name: formData.get('contact_person_name') || null,
      link: formData.get('contact_person_link') || null,
      email: formData.get('contact_person_email') || null,
    }

    const payload: any = {
      ...parsed.data,
      contact_person: contactPersonJson
    }

    const bannerId = await uploadValidImage(formData.get('banner_image') as File | null)
    if (bannerId) payload.banner_image = bannerId

    const cardId = await uploadValidImage(formData.get('card_image') as File | null)
    if (cardId) payload.card_image = cardId

    await adminDirectus.request(updateItem('events', eventId, payload));
    await revalidateEventCache(eventId);
    
    return { success: true }
  } catch (err: any) {
    if (err?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      return { success: false, error: 'Slug is already taken' }
    }
    return { success: false, error: err.message }
  }
}

export async function updateEventStatusAction(eventId: string, rawStatus: unknown) {
  try {
    await requireEventOwnership(eventId)
    
    const parsed = EventStatusSchema.safeParse(rawStatus)
    if (!parsed.success) return { success: false, error: 'Invalid status' }

    await adminDirectus.request(updateItem('events', eventId, { status: parsed.data }));
    await revalidateEventCache(eventId);
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteEventAction(eventId: string) {
  let slug: string | undefined
  try {
    await requireEventOwnership(eventId)

    const event = await adminDirectus.request(
      readItem('events', eventId, { fields: ['slug'] })
    )
    slug = event?.slug

    await adminDirectus.request(deleteItem('events', eventId));

    revalidatePath('/', 'layout')
    revalidatePath('/events')
    await pingWebRevalidate(slug)
  } catch (err: any) {
    return { success: false, error: err.message }
  }

  redirect('/events')
}

export async function saveTimelinePhasesAction(eventId: string, rawPhases: unknown) {
  try {
    await requireEventOwnership(eventId)

    const parsed = z.array(PhaseSchema).safeParse(rawPhases)
    if (!parsed.success) return { success: false, error: 'Invalid phase data' }

    const phases = parsed.data

    await Promise.all(
      phases.map((p, index) => 
        adminDirectus.request(updateItem('event_phases', p.id as string, {
          label: p.label,
          description: p.description || '',
          date_start: p.date_start,
          time_start: p.time_start,
          display_order: index
        }))
      )
    );
    await revalidateEventCache(eventId);
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createEventPhaseAction(eventId: string, rawData: unknown) {
  try {
    await requireEventOwnership(eventId)

    const parsed = PhaseSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: 'Invalid phase data' }
    
    const data = parsed.data

    await adminDirectus.request(createItem('event_phases', {
      event_id: eventId,
      label: data.label,
      date_start: data.date_start,
      time_start: data.time_start,
      status: 'upcoming',
      display_order: data.display_order ?? 0 
    }));
    
    await revalidateEventCache(eventId);
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteEventPhaseAction(eventId: string, phaseId: string) {
  try {
    await requireEventOwnership(eventId)

    const phase = await adminDirectus.request(readItem('event_phases', phaseId, { fields: ['event_id'] }))
    if (phase.event_id !== eventId) {
      throw new Error('Phase does not belong to this event')
    }

    await adminDirectus.request(deleteItem('event_phases', phaseId));
    await revalidateEventCache(eventId);
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}