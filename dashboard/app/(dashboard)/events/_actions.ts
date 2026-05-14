// app/(dashboard)/events/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createItem, uploadFiles } from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { adminDirectus } from '@/lib/directus-admin'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { ROLES } from '@/lib/constants'

const CreateEventSchema = z.object({
  name: z.string().min(3, 'Nama event minimal 3 karakter').max(255),
  slug: z.string().min(3, 'Slug minimal 3 karakter').regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  type: z.enum(['sport', 'arts']),
  location: z.string().min(3, 'Lokasi minimal 3 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  registration_url: z.string().url('URL pendaftaran tidak valid').optional().or(z.literal('')),
  guidebook_url: z.string().url('URL guidebook tidak valid').optional().or(z.literal('')),
  website_url: z.string().url('URL website tidak valid').optional().or(z.literal('')),
  instagram_url: z.string().optional().or(z.literal('')),
  url_youtube: z.string().optional().or(z.literal('')).refine(val => {
    if (!val) return true;
    const isChannel = val.includes('/c/') || val.includes('/channel/') || val.includes('/user/') || val.includes('/@');
    return !isChannel && (val.includes('youtube.com') || val.includes('youtu.be'));
  }, { message: 'YouTube URL harus link video/stream, bukan channel' }),
  contact_person_name: z.string().optional().or(z.literal('')),
  contact_person_email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  contact_person_link: z.string().optional().or(z.literal('')),
})

export async function createEventWithAssetsAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== ROLES.SUPER_ADMIN && session.user.role !== ROLES.ADMINISTRATOR)) {
    return { success: false, error: 'Unauthorized: Hanya Admin yang dapat membuat event baru' }
  }

  // 1. Validation
  const formValues = Object.fromEntries(formData.entries());
  const parsed = CreateEventSchema.safeParse(formValues)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Input tidak valid' }
  }

  const bannerFile = formData.get('banner_image') as File | null
  const cardFile = formData.get('card_image') as File | null

  if (!bannerFile || bannerFile.size === 0) return { success: false, error: 'Banner event wajib diunggah' }
  if (!cardFile || cardFile.size === 0) return { success: false, error: 'Poster event wajib diunggah' }

  // Security: Server-side file validation
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  if (!ALLOWED_TYPES.includes(bannerFile.type)) return { success: false, error: 'Format banner tidak didukung (Gunakan JPG/PNG/WebP)' }
  if (!ALLOWED_TYPES.includes(cardFile.type)) return { success: false, error: 'Format poster tidak didukung (Gunakan JPG/PNG/WebP)' }
  if (bannerFile.size > MAX_SIZE || cardFile.size > MAX_SIZE) return { success: false, error: 'Ukuran file maksimal 5MB' }

  try {
    // 2. Upload Images
    const bannerFormData = new FormData()
    bannerFormData.append('file', bannerFile)
    const cardFormData = new FormData()
    cardFormData.append('file', cardFile)

    const [uploadedBanner, uploadedCard] = await Promise.all([
      adminDirectus.request(uploadFiles(bannerFormData)) as Promise<any>,
      adminDirectus.request(uploadFiles(cardFormData)) as Promise<any>,
    ])

    // 3. Create Event
    const { contact_person_name, contact_person_email, contact_person_link, ...eventData } = parsed.data;
    
    // Construct contact_person array
    const contact_person = contact_person_name ? [{
      name: contact_person_name,
      email: contact_person_email || '',
      link: contact_person_link || '',
    }] : [];

    const event = await adminDirectus.request(
      createItem('events', {
        ...eventData,
        contact_person,
        banner_image: uploadedBanner.id,
        card_image: uploadedCard.id,
        status: 'draft',
        is_published: false,
        is_registration_open: false,
        user_created: session.user.directusId,
      })
    ) as any

    // 4. Create Phases if any
    const phasesRaw = formData.get('phases') as string
    if (phasesRaw) {
      try {
        const phases = JSON.parse(phasesRaw)
        if (Array.isArray(phases) && phases.length > 0) {
          const phasesToCreate = phases
            .filter((p: any) => p.label && p.date_start)
            .map((p: any, idx: number) => ({
              event_id: event.id,
              label: p.label,
              date_start: p.date_start,
              time_start: p.time_start || '00:00:00',
              display_order: idx + 1
            }))
          
          if (phasesToCreate.length > 0) {
            await adminDirectus.request(createItem('event_phases', phasesToCreate))
          }
        }
      } catch (phaseErr) {
        console.error('[createEventWithAssetsAction] Phase creation error:', phaseErr)
      }
    }

    await logActivity({
      action: 'create_event',
      entity: 'events',
      entityId: event.id,
      description: `Membuat event baru: ${parsed.data.name}`,
      eventId: event.id,
    })

    revalidatePath('/events')
    return { success: true, data: event }
  } catch (error: any) {
    // Check for unique constraint (slug)
    const isUniqueError = error?.errors?.some((e: any) => e?.extensions?.code === 'RECORD_NOT_UNIQUE')
    const isPostgresUnique = error?.code === '23505' || error?.message?.toLowerCase().includes('unique constraint')
    
    if (isUniqueError || isPostgresUnique) {
      return { success: false, error: 'Slug sudah digunakan oleh event lain. Silakan gunakan slug yang berbeda.' }
    }
    
    console.error('[createEventWithAssetsAction]', error)
    return { success: false, error: 'Gagal membuat event. Pastikan semua data valid.' }
  }
}
