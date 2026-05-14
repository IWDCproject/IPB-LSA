import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pingWebRevalidate } from '../revalidate'

describe('revalidate utils', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('console', {
      warn: vi.fn(),
      error: vi.fn(),
    })
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('warns if environment variables are missing', async () => {
    delete process.env.WEB_APP_URL
    delete process.env.REVALIDATE_SECRET

    await pingWebRevalidate({ slug: 'test' })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WEB_APP_URL or REVALIDATE_SECRET not set')
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls fetch with correct parameters', async () => {
    process.env.WEB_APP_URL = 'http://web.app'
    process.env.REVALIDATE_SECRET = 'secret123'
    
    ;(fetch as any).mockResolvedValue({ ok: true })

    const payload = { slug: 'test-event', tags: ['news'] }
    await pingWebRevalidate(payload)

    expect(fetch).toHaveBeenCalledWith('http://web.app/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': 'secret123',
      },
      body: JSON.stringify(payload),
    })
  })

  it('logs error if fetch fails', async () => {
    process.env.WEB_APP_URL = 'http://web.app'
    process.env.REVALIDATE_SECRET = 'secret123'
    
    ;(fetch as any).mockResolvedValue({ 
      ok: false, 
      status: 500,
      text: () => Promise.resolve('Server Error')
    })

    await pingWebRevalidate({ slug: 'test' })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('web app ping failed with status 500: Server Error')
    )
  })
})
