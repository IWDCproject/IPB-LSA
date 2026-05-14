import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createArticleAction, 
  updateArticleAction, 
  uploadThumbnailAction 
} from '../_actions'
import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/directus-admin', () => ({
  adminDirectus: {
    request: vi.fn(),
  },
}))

/*
Halaman panduan testing artikel (Bahasa Indonesia)
File ini ngetest editor artikel.
Pengecekan meliputi proteksi XSS, kepemilikan data (IDOR), dan keamanan file.
*/

vi.mock('@directus/sdk', async () => {
  const actual = await vi.importActual('@directus/sdk')
  return {
    ...actual,
    createItem: vi.fn((coll, data) => ({ coll, data, type: 'createItem' })),
    updateItem: vi.fn((coll, id, data) => ({ coll, id, data, type: 'updateItem' })),
    readItem: vi.fn((coll, id, query) => ({ coll, id, query, type: 'readItem' })),
    uploadFiles: vi.fn((data) => ({ data, type: 'uploadFiles' })),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/activity', () => ({ logActivity: vi.fn() }))
vi.mock('@/lib/revalidate', () => ({ pingWebRevalidate: vi.fn() }))

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

describe('Article Editor Logic Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Security and Sanitization', () => {
    it('buang tag berbahaya tapi biarin tag yang aman', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: 'admin-1' } } as any)
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'createItem') return { id: 'new-id', ...req.data }
        return {}
      })

      const payload = {
        title: 'Test Title',
        slug: 'test-title',
        category: 'news',
        content: '<h2>Hello</h2><script>alert("xss")</script><p>World</p><iframe src="https://www.youtube.com/embed/xyz"></iframe>'
      }

      await createArticleAction(payload)
      
      const calls = vi.mocked(adminDirectus.request).mock.calls
      const lastCall = calls.find(c => (c[0] as any).type === 'createItem')
      const savedData = lastCall ? (lastCall[0] as any).data : {}
      
      expect(savedData.content).toContain('<h2>Hello</h2>')
      expect(savedData.content).not.toContain('<script>')
      expect(savedData.content).toContain('iframe')
    })
  })

  describe('IDOR and Ownership', () => {
    it('mencegah orang lain buat update artikel yang bukan miliknya', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'PJ Ormawa', directusId: 'user-A' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem') return { author_id: 'user-B', event_id: { slug: 'event-1' } }
        return {}
      })

      const res = await updateArticleAction(VALID_UUID, { title: 'New Title' })
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error).toContain('do not own this article')
      }
    })

    it('izinkan SuperAdmin edit artikel siapa saja', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: 'admin-1' } } as any)
      
      vi.mocked(adminDirectus.request).mockImplementation(async (req: any) => {
        if (req.type === 'readItem') return { author_id: 'user-B', event_id: { slug: 'event-1' } }
        return { success: true }
      })

      const res = await updateArticleAction(VALID_UUID, { title: 'Admin Edit' })
      expect(res.success).toBe(true)
    })
  })

  describe('File Security', () => {
    it('tolak upload thumbnail kalau formatnya SVG atau PDF', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const formData = new FormData()
      formData.append('file', new File(['bad'], 'test.svg', { type: 'image/svg+xml' }))

      const res = await uploadThumbnailAction(formData)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Only JPG, PNG, and WEBP images are allowed')
    })

    it('tolak file thumbnail yang lebih dari 5MB', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin' } } as any)
      
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', largeFile)

      const res = await uploadThumbnailAction(formData)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('exceeds 5MB limit')
    })
  })

  describe('Database Constraints', () => {
    it('tangani error slug duplikat dari database secara gracefully', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { role: 'SuperAdmin', directusId: 'admin-1' } } as any)
      
      vi.mocked(adminDirectus.request).mockRejectedValue({
        errors: [{ extensions: { code: 'RECORD_NOT_UNIQUE' } }]
      })

      const res = await createArticleAction({
        title: 'Duplicate',
        slug: 'same-slug',
        category: 'news'
      })

      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain('Slug is already in use')
    })
  })
})
