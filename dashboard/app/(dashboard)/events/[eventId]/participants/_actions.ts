// app/(dashboard)/events/[eventId]/participants/_actions.ts
'use server'

import { auth } from '@/lib/auth' // Menggunakan helper auth() dari file agan
import { createDirectus, rest, staticToken, createItem, uploadFiles } from '@directus/sdk'
import { revalidatePath } from 'next/cache'

// Gunakan token rahasia dari server env
const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

export async function createParticipantAction(payload: any) {
  const session = await auth()
  
  // Debug: Liat di terminal vscode agan pas nge-klik simpan
  console.log("ISI SESSION DI ACTION:", session?.user)

  if (!session || !session.user) {
    return { success: false, error: 'Unauthorized: Silakan login kembali.' }
  }

  const userRole = session.user.role
  
  if (userRole !== 'SuperAdmin' && userRole !== 'PJ Ormawa') {
     // Pesan error ini muncul karena userRole tadi undefined
     return { success: false, error: `Forbidden: Role anda (${userRole}) tidak punya akses.` }
  }

  try {
    // 4. Eksekusi ke Directus menggunakan Admin SDK (Privileged)
    await adminDirectus.request(createItem('participants', payload))

    // 5. Force Next.js untuk refresh data di halaman peserta (tanpa reload browser)
    revalidatePath(`/events/[eventId]/participants`, 'page')

    return { success: true }
  } catch (error: any) {
    console.error('Server Action Error:', error)
    return { 
      success: false, 
      error: error.errors?.[0]?.message || 'Gagal menyimpan ke database.' 
    }
  }
}

export async function createInstitutionAction(formData: FormData) {
  const session = await auth()

  if (!session || !session.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Hanya SuperAdmin atau PJ Ormawa yang boleh
  if (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const name = formData.get('name') as string
    const eventId = formData.get('eventId') as string
    const color = formData.get('color') as string
    const logoFile = formData.get('logo') as File | null

    let logoId: string | null = null

    // 1. Jika ada file logo, upload ke Directus Assets dulu
    if (logoFile && logoFile.size > 0) {
      const uploadFormData = new FormData()
      uploadFormData.append('file', logoFile)
      
      const uploadedFile = await adminDirectus.request(uploadFiles(uploadFormData))
      logoId = uploadedFile.id
    }

    // 2. Buat record Institusi
    await adminDirectus.request(
      createItem('institutions', {
        event_id: eventId,
        name: name,
        logo: logoId,
        color: color || null,
      })
    )

    revalidatePath(`/events/[eventId]/participants`, 'page')
    return { success: true }
  } catch (error: any) {
    console.error('Institution Action Error:', error)
    return { success: false, error: 'Gagal menambah institusi' }
  }
}
