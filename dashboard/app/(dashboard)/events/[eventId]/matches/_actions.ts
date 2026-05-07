// app/(dashboard)/events/[eventId]/matches/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { createDirectus, rest, staticToken, createItem } from '@directus/sdk'
import { revalidatePath } from 'next/cache'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

export async function createMatchAction(payload: {
  competition_category_id: string
  match_name: string | null
  round: string | null
  venue: string
  scheduled_at: string
  home_participant_id: string | null
  away_participant_id: string | null
  participant_ids?: string[] // Untuk tipe 'open'
}) {
  const session = await auth()
  if (!session || (session.user.role !== 'SuperAdmin' && session.user.role !== 'PJ Ormawa')) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { participant_ids, ...matchData } = payload

    // 1. Buat Match utama
    const match = await adminDirectus.request(
      createItem('matches', {
        ...matchData,
        status: 'upcoming',
        live_state: {}
      })
    )

    // 2. Jika tipe 'open', isi junction table match_participants
    if (participant_ids && participant_ids.length > 0) {
      for (const [idx, pid] of participant_ids.entries()) {
        await adminDirectus.request(
          createItem('match_participants', {
            match_id: match.id,
            participant_id: pid,
            position: idx + 1
          })
        )
      }
    }

    revalidatePath(`/events/[eventId]/matches`, 'page')
    return { success: true }
  } catch (error: any) {
    console.error('Match Action Error:', error)
    return { success: false, error: 'Gagal membuat pertandingan' }
  }
}