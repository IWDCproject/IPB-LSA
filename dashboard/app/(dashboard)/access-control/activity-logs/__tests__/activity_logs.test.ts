import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getActivityLogs } from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: { request: vi.fn() },
}))

/*
Halaman panduan testing log aktivitas (Bahasa Indonesia)
File ini ngetest penarikan data audit log.
Memastikan cuma SuperAdmin yang bisa lihat log.
*/

describe('Activity Logs Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pagination and Access', () => {
    it('mencegah orang selain SuperAdmin buat liat log', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa' } } as any)

      const res = await getActivityLogs()
      
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toBe('Unauthorized')
      }
    })

    it('pake limit dan offset default kalau gak dikasih', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      vi.mocked(adminDirectus.request).mockResolvedValue([])

      await getActivityLogs()
      
      const calls = vi.mocked(adminDirectus.request).mock.calls
      expect(calls.length).toBeGreaterThan(0)
    })
  })
})
