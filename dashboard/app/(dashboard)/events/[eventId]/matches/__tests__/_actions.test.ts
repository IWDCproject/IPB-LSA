import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMatchAction } from '../_actions'
import { adminDirectus } from '@/lib/directus-admin'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { pingWebRevalidate } from '@/lib/revalidate'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: {
    request: vi.fn()
  }
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('@/lib/revalidate', () => ({
  pingWebRevalidate: vi.fn()
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn()
}))

describe('matches _actions', () => {
  describe('createMatchAction', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns unauthorized if no session', async () => {
      ;(auth as any).mockResolvedValue(null)
      const result = await createMatchAction({} as any)
      expect(result).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns error if validation fails', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'SuperAdmin' } })
      const result = await createMatchAction({ eventSlug: '' } as any) // missing fields
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('successfully creates a match for SuperAdmin', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: 'user-1' } })
      
      // Mock category check (not needed for SuperAdmin but let's be safe)
      // Actually SuperAdmin bypasses the ownership check in some places, but in createMatchAction line 74:
      // if (session.user.role === 'PJ Ormawa') { ... } 
      // So SuperAdmin skips it.

      // Mock match creation
      ;(adminDirectus.request as any).mockResolvedValueOnce({ id: 'match-1' }) // createItem matches
      // Mock event ID fetch for logging
      .mockResolvedValueOnce([{ id: 'event-1' }]) // readItems events

      const payload = {
        eventSlug: 'test-event',
        competition_category_id: '00000000-0000-0000-0000-000000000000',
        match_name: 'Test Match',
        status: 'upcoming'
      }

      const result = await createMatchAction(payload as any)

      expect(result.success).toBe(true)
      expect(adminDirectus.request).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/events/test-event/matches', 'page')
      expect(pingWebRevalidate).toHaveBeenCalledWith({ slug: 'test-event' })
    })

    it('blocks PJ Ormawa if they do not own the category', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: 'user-1' } })
      
      // Mock category ownership check
      ;(adminDirectus.request as any).mockResolvedValueOnce({ 
        event_id: { user_created: 'other-user' } 
      })

      const payload = {
        eventSlug: 'test-event',
        competition_category_id: '00000000-0000-0000-0000-000000000000',
        match_name: 'Test Match'
      }

      const result = await createMatchAction(payload as any)

      expect(result).toEqual({ success: false, error: 'Forbidden: You do not own this category' })
    })
  })
})
