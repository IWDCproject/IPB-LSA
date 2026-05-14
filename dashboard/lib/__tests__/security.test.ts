import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMatchAction } from '@/app/(dashboard)/events/[eventId]/matches/_actions'
import { getOperators } from '@/app/(dashboard)/access-control/operators/_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'
import { ROLES } from '@/lib/constants'

// Mocking dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: {
    request: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn(),
}))

vi.mock('@/lib/revalidate', () => ({
  pingWebRevalidate: vi.fn(),
}))

// A more standard UUID
const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('Security & RBAC Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Guards', () => {
    it('returns Unauthorized when no session is present', async () => {
      vi.mocked(auth).mockResolvedValue(null)
      
      const res = await createMatchAction({ eventSlug: 'test', competition_category_id: VALID_UUID } as any)
      expect(res).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns Forbidden/Akses ditolak when non-admin accesses operator management', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: ROLES.OPERATOR, directusId: 'op1' },
      } as any)

      const res = await getOperators()
      expect(res).toEqual({ success: false, error: 'Akses ditolak.' })
    })
  })

  describe('IDOR & Ownership Guards', () => {
    const mockOperatorSession = {
      user: { role: ROLES.OPERATOR, directusId: 'operator-123' },
    }

    it('prevents Operator from creating a match in a category they do not own', async () => {
      vi.mocked(auth).mockResolvedValue(mockOperatorSession as any)
      
      // 1. Mock category belonging to another user
      vi.mocked(adminDirectus.request).mockResolvedValueOnce({
        event_id: { user_created: 'other-user-uuid' }
      })

      const payload = {
        eventSlug: 'event-1',
        competition_category_id: VALID_UUID,
        match_name: 'Final',
      }

      const res = await createMatchAction(payload as any)
      expect(res.success).toBe(false)
      expect(res.error).toContain('do not own this category')
    })

    it('allows Operator to create a match in their own category', async () => {
      vi.mocked(auth).mockResolvedValue(mockOperatorSession as any)
      
      // 1. Mock category ownership check
      vi.mocked(adminDirectus.request).mockResolvedValueOnce({
        event_id: { user_created: 'operator-123' }
      })
      // 2. Mock participant check (return empty list = all valid for this test)
      vi.mocked(adminDirectus.request).mockResolvedValueOnce([])
      // 3. Mock the actual creation
      vi.mocked(adminDirectus.request).mockResolvedValueOnce({ id: 'new-match-id' })

      const payload = {
        eventSlug: 'event-1',
        competition_category_id: VALID_UUID,
        match_name: 'Final',
      }

      const res = await createMatchAction(payload as any)
      expect(res.success).toBe(true)
    })

    it('allows SuperAdmin to create a match in ANY category', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { role: ROLES.SUPER_ADMIN, directusId: 'admin-1' },
      } as any)
      
      // SuperAdmin bypasses ownership check, goes straight to participant validation
      vi.mocked(adminDirectus.request).mockResolvedValueOnce([]) // participants valid
      vi.mocked(adminDirectus.request).mockResolvedValueOnce({ id: 'new-match-id' })

      const payload = {
        eventSlug: 'event-1',
        competition_category_id: VALID_UUID,
        match_name: 'Final',
      }

      const res = await createMatchAction(payload as any)
      expect(res.success).toBe(true)
    })
  })
})
