import { describe, it, expect, vi, beforeEach } from 'vitest'
import { patchLiveStateAction, setMatchStatusAction } from '../_actions'
import { auth } from '@/lib/auth'
import { createDirectus, readItem } from '@directus/sdk'

// Mocking dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const mockRequest = vi.fn()

vi.mock('@directus/sdk', async () => {
  const actual = await vi.importActual('@directus/sdk')
  return {
    ...actual,
    createDirectus: vi.fn(() => ({
      with: vi.fn().mockReturnThis(),
      request: mockRequest,
    })),
    rest: vi.fn(),
    staticToken: vi.fn(),
    readItem: vi.fn((coll, id, query) => ({ coll, id, query, type: 'readItem' })),
    updateItem: vi.fn((coll, id, data) => ({ coll, id, data, type: 'updateItem' })),
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/revalidate', () => ({
  pingWebRevalidate: vi.fn(),
}))

const VALID_MATCH_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('Scoring & Live State Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DIRECTUS_URL = 'http://localhost:8055'
    process.env.DIRECTUS_STATIC_TOKEN = 'test-token'
    
    // Default mock for ownership check
    mockRequest.mockImplementation(async (req: any) => {
      if (req.type === 'readItem') {
        return {
          live_state: { homeScore: 10, awayScore: 5 },
          competition_category_id: { 
            event_id: { slug: 'test-event', user_created: 'op-123' } 
          }
        }
      }
      return { id: 'ok' }
    })
  })

  describe('patchLiveStateAction', () => {
    it('successfully merges partial state with existing live_state', async () => {
      vi.mocked(auth).mockResolvedValue({ 
        user: { role: 'PJ Ormawa', directusId: 'op-123' } 
      } as any)
      
      const res = await patchLiveStateAction(VALID_MATCH_ID, { homeScore: 12 })
      
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.liveState.homeScore).toBe(12)
        expect(res.liveState.awayScore).toBe(5)
      }
    })

    it('rejects invalid payloads (e.g. non-numeric score)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const res = await patchLiveStateAction(VALID_MATCH_ID, { homeScore: 'not-a-number' as any })
      
      expect(res.success).toBe(false)
      expect(res.error).toContain('Invalid payload')
    })

    it('handles corrupted or stringified live_state in database', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      mockRequest.mockImplementation(async (req: any) => {
        if (req.type === 'readItem') {
          return {
            live_state: '{"homeScore": 5}',
            competition_category_id: { event_id: { slug: 'test-event' } }
          }
        }
        return { id: 'ok' }
      })

      const res = await patchLiveStateAction(VALID_MATCH_ID, { awayScore: 3 })
      
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.liveState.homeScore).toBe(5)
        expect(res.liveState.awayScore).toBe(3)
      }
    })
  })

  describe('setMatchStatusAction', () => {
    it('updates both match status and internal liveState.matchStatus', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const res = await setMatchStatusAction(VALID_MATCH_ID, 'live', { timerRunning: true })
      
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.liveState.matchStatus).toBe('live')
        expect(res.liveState.timerRunning).toBe(true)
      }
    })

    it('returns generic error for invalid status (as it is not in safeError list)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const res = await setMatchStatusAction(VALID_MATCH_ID, 'invalid-status' as any)
      
      expect(res.success).toBe(false)
      // Since 'Invalid match status' is not in safeError's whitelist
      expect(res.error).toBe('Terjadi kesalahan server. Silakan coba lagi.')
    })
  })
})
