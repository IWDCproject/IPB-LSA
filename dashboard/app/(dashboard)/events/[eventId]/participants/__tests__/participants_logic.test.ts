import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createParticipantAction, 
  updateParticipantAction, 
  createInstitutionAction,
  updateInstitutionAction,
  getParticipantsDataAction
} from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: { request: vi.fn() },
}))

/*
Halaman panduan testing peserta (Bahasa Indonesia)
File ini ngetest manajemen peserta lomba dan institusi.
Fokus utamanya adalah memastikan data gak bocor ke event lain (IDOR).
*/

vi.mock('@directus/sdk', async () => {
  const actual = await vi.importActual('@directus/sdk')
  return {
    ...actual,
    createItem: vi.fn((coll, data) => ({ coll, data, type: 'createItem' })),
    updateItem: vi.fn((coll, id, data) => ({ coll, id, data, type: 'updateItem' })),
    readItem: vi.fn((coll, id, query) => ({ coll, id, query, type: 'readItem' })),
    readItems: vi.fn((coll, query) => ({ coll, query, type: 'readItems' })),
    deleteItem: vi.fn((coll, id) => ({ coll, id, type: 'deleteItem' })),
    uploadFiles: vi.fn((data) => ({ data, type: 'uploadFiles' })),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))
vi.mock('@/lib/revalidate', () => ({ pingWebRevalidate: vi.fn() }))

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('Participant and Institution Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Security and Ownership', () => {
    it('mencegah operator nambah peserta ke kategori yang bukan miliknya', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: 'op-1' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem' && req.coll === 'competition_categories') {
          return { event_id: { id: 'evt-1', slug: 'slug-1' } }
        }
        if (req.type === 'readItem' && req.coll === 'events') {
          return { id: 'evt-1', slug: 'slug-1', user_created: 'op-2' } 
        }
        return {}
      })

      const res = await createParticipantAction({
        competition_category_id: VALID_UUID,
        name: 'Hacker',
      })
      
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toContain('tidak punya akses ke event ini')
      }
    })

    it('mencegah operator update institusi milik event lain', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: 'op-1' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        // Institusi ini milik event-lain
        if (req.type === 'readItem' && req.coll === 'institutions') return { event_id: 'evt-lain' }
        // Event-lain ini dibuat oleh orang-lain
        if (req.type === 'readItem' && req.coll === 'events') return { user_created: 'orang-lain' }
        return {}
      })

      const formData = new FormData()
      formData.append('institutionId', VALID_UUID)
      formData.append('name', 'Hacker Uni')

      const res = await updateInstitutionAction(formData)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('tidak punya akses')
    })
  })

  describe('Data Integrity', () => {
    it('buang field yang gak ada di daftar whitelist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: 'admin' } } as any)
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem' && req.coll === 'competition_categories') return { event_id: { id: 'evt-1', slug: 'slug-1' } }
        if (req.type === 'readItem' && req.coll === 'events') return { id: 'evt-1', user_created: 'admin' }
        return { success: true }
      })

      const maliciousPayload = {
        competition_category_id: VALID_UUID,
        name: 'Valid Name',
        status: 'winner',
        is_admin: true
      }

      await createParticipantAction(maliciousPayload)
      
      const createCall = vi.mocked(adminDirectus.request).mock.calls.find(c => (c[0] as any).type === 'createItem')
      const savedData = createCall ? (createCall[0] as any).data : {}
      expect(savedData.status).toBeUndefined()
    })
  })

  describe('File Upload Guards', () => {
    it('tolak file yang formatnya bukan gambar buat logo institusi', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem' && req.coll === 'events') return { id: 'evt-1', user_created: 'admin' }
        return {}
      })

      const formData = new FormData()
      formData.append('eventId', VALID_UUID)
      formData.append('name', 'Bad Logo Univ')
      formData.append('logo', new File(['bad'], 'test.pdf', { type: 'application/pdf' }))

      const res = await createInstitutionAction(formData)
      
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toContain('Tipe file tidak didukung')
      }
    })
  })
})
