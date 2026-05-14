import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createAccount, 
  updateAccount, 
  toggleAccess, 
  deleteAccount 
} from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: { request: vi.fn() },
}))

/*
Halaman panduan testing operator (Bahasa Indonesia)
File ini ngetest logika manajemen akun operator atau admin.
Kita pake Vitest dan nge-mock Directus biar gak nembak database beneran.

Hal yang dites:
1. Pengecekan sesi (Security).
2. Pencegahan hapus akun sendiri (Self-modification).
*/

vi.mock('@directus/sdk', async () => {
  const actual = await vi.importActual('@directus/sdk')
  return {
    ...actual,
    readUsers: vi.fn(() => ({ type: 'readUsers' })),
    readRoles: vi.fn(() => ({ type: 'readRoles' })),
    createUser: vi.fn(() => ({ type: 'createUser' })),
    updateUser: vi.fn(() => ({ type: 'updateUser' })),
    deleteUser: vi.fn(() => ({ type: 'deleteUser' })),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const ANOTHER_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('Operator Management Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
      if (req.type === 'readRoles') return [{ id: 'role-admin', name: 'SuperAdmin' }]
      if (req.type === 'readUsers') return [{ role: { id: 'role-admin' }, email: 'test@example.com' }]
      return { success: true }
    })
  })

  describe('Security and Access', () => {
    it('mencegah akses kalau sesi gak ada', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      const res = await deleteAccount(ANOTHER_UUID)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Akses ditolak')
    })

    it('mencegah PJ Ormawa bikin akun baru', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: VALID_UUID } } as any)
      const res = await createAccount(new FormData())
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Akses ditolak')
    })
  })

  describe('Self Modification', () => {
    it('mencegah user hapus akunnya sendiri', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: VALID_UUID } } as any)
      const res = await deleteAccount(VALID_UUID)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('tidak bisa menghapus akunmu sendiri')
    })
  })
})
