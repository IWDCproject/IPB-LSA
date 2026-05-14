import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  upsertFormatAction, 
  upsertCategoryAction, 
  deleteCategoryAction 
} from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: { request: vi.fn() },
}))

/*
Halaman panduan testing format pertandingan (Bahasa Indonesia)
File ini ngetest logika pembuatan format scoring dan kategori lomba.
Bagian ini kritikal karena menentukan gimana skor dihitung di sistem.

Hal yang dites:
1. Resolusi Slug ke UUID (biar URL cantik tetep aman di database).
2. Kepemilikan (IDOR): Operator gak boleh ganti format event orang lain.
3. Hak akses hapus: Cuma admin yang boleh hapus kategori.
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
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const ANOTHER_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('Format and Category Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Security and Ownership (IDOR)', () => {
    it('mencegah operator akses event milik orang lain lewat slug', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: 'op-1' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        // Simulasi cari event pake slug, tapi ternyata user_created nya beda
        if (req.type === 'readItems' && req.coll === 'events') {
          return [{ id: 'evt-1', slug: 'event-jahat', user_created: 'op-lain' }]
        }
        return []
      })

      const res = await upsertFormatAction({
        event_id: 'event-jahat',
        name: 'Format Ilegal',
        match_type: 'head_to_head',
        modules: [{ type: 'basic', config: {} }]
      })
      
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('You do not own this event')
    })

    it('mencegah ganti format yang event_id nya gak sesuai (Ownership Mismatch)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItems' && req.coll === 'events') return [{ id: 'evt-benar', slug: 'slug' }]
        // Format ini ternyata punya event lain di database
        if (req.type === 'readItem' && req.coll === 'match_formats') return { event_id: 'evt-salah' }
        return {}
      })

      const res = await upsertFormatAction({
        id: VALID_UUID,
        event_id: 'slug',
        name: 'Format Update',
        match_type: 'head_to_head',
        modules: [{ type: 'basic', config: {} }]
      })

      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Ownership mismatch')
    })
  })

  describe('Role Access', () => {
    it('mencegah operator hapus kategori (Cuma Admin yang boleh)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa' } } as any)
      
      const res = await deleteCategoryAction(VALID_UUID)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Hanya Admin')
    })
  })

  describe('Validation', () => {
    it('tolak format kalau gak ada module engine nya', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const res = await upsertFormatAction({
        event_id: VALID_UUID,
        name: 'Format Kosong',
        match_type: 'head_to_head',
        modules: [] // Gak boleh kosong
      })

      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Data format tidak valid')
    })
  })
})
