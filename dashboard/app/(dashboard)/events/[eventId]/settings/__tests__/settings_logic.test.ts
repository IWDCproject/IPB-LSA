import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  updateEventInfoAction, 
  saveTimelinePhasesAction, 
  deleteEventPhaseAction 
} from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: { request: vi.fn() },
}))

/*
Halaman panduan testing pengaturan (Bahasa Indonesia)
File ini ngetest konfigurasi event dan timeline.
Pengecekan meliputi validasi data Zod dan kepemilikan fasa event.
*/

vi.mock('@directus/sdk', async () => {
  const actual = await vi.importActual('@directus/sdk')
  return {
    ...actual,
    createItem: vi.fn((coll, data) => ({ coll, data, type: 'createItem' })),
    updateItem: vi.fn((coll, id, data) => ({ coll, id, data, type: 'updateItem' })),
    readItem: vi.fn((coll, id, query) => ({ coll, id, query, type: 'readItem' })),
    deleteItem: vi.fn((coll, id) => ({ coll, id, type: 'deleteItem' })),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))
vi.mock('@/lib/revalidate', () => ({ pingWebRevalidate: vi.fn() }))

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('Event Settings Logic Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Information Updates', () => {
    it('tolak data yang gak valid lewat validasi Zod', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const formData = new FormData()
      formData.append('eventId', VALID_UUID)
      formData.append('name', '')
      formData.append('slug', 'Invalid Slug')
      formData.append('type', 'sport')

      const res = await updateEventInfoAction(formData)
      
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Invalid data submitted')
    })
  })

  describe('Timeline and Phases', () => {
    it('mencegah hapus fasa lomba yang punya event lain', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem' && req.coll === 'event_phases') {
          return { event_id: 'some-other-event-id' }
        }
        return {}
      })

      const res = await deleteEventPhaseAction(VALID_UUID, 'phase-id')
      
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Phase does not belong to this event')
    })
  })
})
