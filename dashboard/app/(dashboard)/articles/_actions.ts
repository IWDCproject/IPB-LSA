'use server'

import { auth } from '@/lib/auth'
import { createDirectus, rest, staticToken, createItem, updateItem, uploadFiles } from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import type { NewsArticle, NewsCategory } from '@/types/directus'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Types -----------------------------------------------------

export type ArticlePayload = {
  title:        string
  slug:         string
  excerpt:      string | null
  category:     NewsCategory
  event_id:     string | null
  thumbnail:    string | null
  content:      string | null
  is_published: boolean
  published_at: string | null
}

// --- Server-side HTML sanitizer --------------------------------

/**
 * Strips the most dangerous HTML patterns before persisting to the database.
 * Regex-based because DOMParser is not available in the Node.js runtime.
 *
 * The client-side sanitizer (page.tsx) is the primary defence; this is a
 * belt-and-suspenders second layer that protects against tampered requests
 * that bypass the browser entirely.
 *
 * Stripped:  <script>, <style>, <object>, <embed>, <form>, <meta>, <link>, <base>
 * Removed:   all on* event-handler attributes
 * Removed:   javascript: / data: / vbscript: in href, src, action, formaction
 */
function sanitizeContentHtml(html: string): string {
  return html
    // Remove script tags and their full contents (greedy content match)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove other dangerous paired tags and their contents
    .replace(/<(style|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove dangerous void/self-closing tags
    .replace(/<(meta|link|base)\b[^>]*\/?>/gi, '')
    // Strip all on* event-handler attributes
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)/gi, '')
    // Strip javascript:/data:/vbscript: from URL attributes
    .replace(
      /(\s+(?:href|src|action|formaction)\s*=\s*["']?)\s*(?:javascript|data|vbscript):[^"'\s>]*/gi,
      '$1#',
    )
}

// --- Actions ---------------------------------------------------

export async function createArticleAction(payload: ArticlePayload) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  const authorId = (session.user as { directusId?: string }).directusId
  if (!authorId) return { success: false as const, error: 'No user ID in session' }

  const safePayload = {
    ...payload,
    content: payload.content ? sanitizeContentHtml(payload.content) : null,
  }

  try {
    const article = await adminDirectus.request(
      createItem('news', { ...safePayload, author_id: authorId })
    ) as NewsArticle
    revalidatePath('/articles')
    return { success: true as const, article }
  } catch (err: unknown) {
    return { success: false as const, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateArticleAction(id: string, payload: Partial<ArticlePayload>) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  const safePayload = {
    ...payload,
    ...(payload.content != null && { content: sanitizeContentHtml(payload.content) }),
  }

  try {
    await adminDirectus.request(updateItem('news', id, safePayload))
    revalidatePath('/articles')
    return { success: true as const }
  } catch (err: unknown) {
    return { success: false as const, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function uploadThumbnailAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  try {
    const result = await adminDirectus.request(uploadFiles(formData)) as { id: string }
    return { success: true as const, id: result.id }
  } catch (err: unknown) {
    return { success: false as const, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}