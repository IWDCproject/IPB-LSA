// app/(dashboard)/events/[eventId]/formats/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createDirectus, rest, staticToken, createItem, updateItem, deleteItem } from '@directus/sdk'
import { revalidatePath } from 'next/cache'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())


export async function upsertFormatAction(payload: any) {
  const session = await auth()
  if (!session || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) {
    return { success: false, error: 'Unauthorized/Forbidden' }
  }

  try {
    const { id, ...data } = payload
    if (id) {
      await adminDirectus.request(updateItem('match_formats', id, data))
    } else {
      await adminDirectus.request(createItem('match_formats', data))
    }
    revalidatePath(`/events/[eventId]/formats`, 'page')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: 'Database error: Gagal menyimpan format.' }
  }
}

export async function upsertCategoryAction(payload: {
  id?: string
  event_id: string
  name: string
  participant_type: string
  format_id: string | null
  display_order: number
}) {
  const session = await auth()
  if (!session || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { id, ...data } = payload
    if (id) {
      await adminDirectus.request(updateItem('competition_categories', id, data))
    } else {
      await adminDirectus.request(createItem('competition_categories', data))
    }
    revalidatePath(`/events/[eventId]/formats`, 'page')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Gagal menyimpan kategori' }
  }
}

export async function deleteCategoryAction(id: string) {
  const session = await auth()
  if (!session || session.user.role !== 'SuperAdmin') return { success: false }
  
  try {
    await adminDirectus.request(deleteItem('competition_categories', id))
    revalidatePath(`/events/[eventId]/formats`, 'page')
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}