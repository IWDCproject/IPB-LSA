// app/(dashboard)/events/[eventId]/settings/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createDirectus, rest, staticToken, updateItem, deleteItem, createItem, uploadFiles, readItem } from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- HELPER UNTUK INSTANT CACHE BUSTING ---
async function revalidateEventCache(eventId: string) {
  try {
    const event = await adminDirectus.request(readItem('events', eventId, { fields: ['slug'] }));
    if (event?.slug) {
      // Menghapus cache secara total di seluruh app (Dashboard & Public Web)
      revalidatePath('/', 'layout');
    }
  } catch (err) {
    console.error("Cache bust failed", err);
  }
}

export async function updateEventInfoAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  const eventId = formData.get('eventId') as string;
  try {
    const payload: any = {
      name: formData.get('name'),
      location: formData.get('location'),
      description: formData.get('description'),
      start_date: formData.get('start_date') || null,
      end_date: formData.get('end_date') || null,
    }

    const bannerFile = formData.get('banner_image') as File | null;
    const cardFile = formData.get('card_image') as File | null;

    if (bannerFile && bannerFile.size > 0) {
      const uf = new FormData(); uf.append('file', bannerFile);
      const res = await adminDirectus.request(uploadFiles(uf));
      payload.banner_image = res.id;
    }

    if (cardFile && cardFile.size > 0) {
      const uf = new FormData(); uf.append('file', cardFile);
      const res = await adminDirectus.request(uploadFiles(uf));
      payload.card_image = res.id;
    }

    await adminDirectus.request(updateItem('events', eventId, payload));
    await revalidateEventCache(eventId); // BUST CACHE
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateEventStatusAction(eventId: string, status: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  try {
    await adminDirectus.request(updateItem('events', eventId, { status }));
    await revalidateEventCache(eventId); // BUST CACHE
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteEventAction(eventId: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  try {
    await adminDirectus.request(deleteItem('events', eventId));
    revalidatePath('/', 'layout'); // BUST CACHE
  } catch (err: any) {
    return { success: false, error: err.message }
  }
  redirect('/events')
}

// ACTION BARU: Menyimpan semua timeline sekaligus (Batch)
export async function saveTimelinePhasesAction(eventId: string, phases: any[]) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  try {
    await Promise.all(
      phases.map((p, index) => 
        adminDirectus.request(updateItem('event_phases', p.id, {
          label: p.label,
          description: p.description,
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

export async function createEventPhaseAction(eventId: string, data: any) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  try {
    await adminDirectus.request(createItem('event_phases', {
      event_id: eventId,
      label: data.label,
      date_start: data.date_start,
      time_start: data.time_start,
      status: 'upcoming',
      display_order: data.display_order ?? 0 
    }));
    await revalidateEventCache(eventId); // BUST CACHE
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteEventPhaseAction(eventId: string, phaseId: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) return { success: false, error: 'Unauthorized' }

  try {
    await adminDirectus.request(deleteItem('event_phases', phaseId));
    await revalidateEventCache(eventId); // BUST CACHE
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}