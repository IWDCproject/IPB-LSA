'use server'

import { auth } from '@/lib/auth'
import { 
  createDirectus, 
  rest, 
  staticToken, 
  createItem, 
  updateItem, 
  readItem, 
  uploadFiles 
} from '@directus/sdk'
import { revalidatePath } from 'next/cache'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { pingWebRevalidate } from '@/lib/revalidate'
import type { NewsArticle, NewsCategory } from '@/types/directus'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

// --- Zod Schemas for Runtime Validation ------------------------

const NewsCategorySchema = z.enum(['announcement', 'result', 'news', 'update'])

// .strip() (default) drops unknown keys without rejecting the payload
const ArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  // Enforce URL-safe slug to prevent routing bugs
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens"),
  excerpt: z.string().nullable().optional(),
  category: NewsCategorySchema,
  // Coerce empty string → null before UUID check; controlled inputs emit "" when unset
  event_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid("Invalid Event ID").nullable().optional()),
  thumbnail: z.preprocess((v) => (v === '' ? null : v), z.string().uuid("Invalid Thumbnail ID").nullable().optional()),
  content: z.string().nullable().optional(),
  is_published: z.boolean().default(false),
  // offset:true accepts "Z" and "+HH:MM"; union also accepts datetime-local (no tz) from <input type="datetime-local">
  published_at: z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/), z.null(), z.undefined()]).optional(),
})

// --- Server-side HTML Sanitizer --------------------------------

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    // Note: 'h1' is removed. Users should use h2 and below in content to preserve page SEO structure.
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h2', 'h3', 'h4', 'u', 's' ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'a':[ 'href', 'name', 'target', 'rel' ],
      'img':[ 'src', 'alt', 'title', 'width', 'height' ]
    },
    // Strictly HTTP/S. Removed 'data' to prevent 10MB base64 image injections in the DB.
    allowedSchemes:[ 'http', 'https', 'mailto' ],
    allowedSchemesByTag: { img: [ 'http', 'https' ] },
    allowProtocolRelative: false,
  })
}

// --- Auth Guards -----------------------------------------------

async function verifyEventOwnership(eventId: string, userId: string, role: string) {
  if (role === 'SuperAdmin' || role === 'Administrator') return true;

  try {
    const event = await adminDirectus.request(
      readItem('events', eventId, { fields: ['user_created'] })
    )
    return event.user_created === userId;
  } catch {
    return false;
  }
}

// --- Actions ---------------------------------------------------

export async function createArticleAction(rawPayload: unknown) {
  const session = await auth()
  const userId = session?.user?.directusId
  const userRole = session?.user?.role

  if (!userId || !userRole) return { success: false as const, error: 'Unauthorized' }

  const parsed = ArticleSchema.safeParse(rawPayload)
  if (!parsed.success) return { success: false as const, error: 'Invalid data submitted' }
  const payload = parsed.data

  // 1. Cross-Tenant Injection Protection
  if (payload.event_id) {
    const ownsEvent = await verifyEventOwnership(payload.event_id, userId, userRole)
    if (!ownsEvent) return { success: false as const, error: 'Forbidden: You cannot post news to this event' }
  }

  // Auto-populate published_at if publishing now
  if (payload.is_published && !payload.published_at) {
    payload.published_at = new Date().toISOString()
  }

  const safePayload = {
    ...payload,
    content: payload.content ? sanitizeContent(payload.content) : null,
    author_id: userId 
  }

  try {
    const article = await adminDirectus.request(
      createItem('news', safePayload)
    ) as NewsArticle
    
    // Invalidate the specific event's news tab
    if (payload.event_id) {
      const event = await adminDirectus.request(readItem('events', payload.event_id, { fields: ['slug'] })) as any
      revalidatePath(`/events/${event.slug}`)
      await pingWebRevalidate({ slug: event.slug, tags: ['collection:news'] })
    } else {
      await pingWebRevalidate({ tags: ['collection:news'] })
    }

    return { success: true as const, article }
  } catch (err: any) {
    // Handle Postgres Unique Constraint Gracefully
    if (err?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      return { success: false as const, error: 'Slug is already in use.' }
    }
    return { success: false as const, error: 'Failed to create article.' }
  }
}

export async function updateArticleAction(id: string, rawPayload: unknown) {
  const session = await auth()
  const userId = session?.user?.directusId
  const userRole = session?.user?.role

  if (!userId || !userRole) return { success: false as const, error: 'Unauthorized' }

  let existingArticle;
  try {
    // Fetch event_id.slug simultaneously for cache purging later
    existingArticle = await adminDirectus.request(
      readItem('news', id, { fields: ['author_id', 'event_id.slug'] })
    ) as any
  } catch {
    return { success: false as const, error: 'Article not found' }
  }

  // 1. IDOR Protection (with SuperAdmin bypass)
  if (existingArticle.author_id !== userId && userRole !== 'SuperAdmin' && userRole !== 'Administrator') {
    return { success: false as const, error: 'Forbidden: You do not own this article' }
  }

  const parsed = ArticleSchema.partial().safeParse(rawPayload)
  if (!parsed.success) return { success: false as const, error: 'Invalid data submitted' }
  const payload = parsed.data

  // 2. Cross-Tenant Protection on Event reassignment
  if (payload.event_id && payload.event_id !== existingArticle.event_id?.id) {
    const ownsEvent = await verifyEventOwnership(payload.event_id, userId, userRole)
    if (!ownsEvent) return { success: false as const, error: 'Forbidden: You cannot reassign this article to that event' }
  }

  const safePayload = {
    ...payload,
    ...(payload.content != null && { content: sanitizeContent(payload.content) }),
  }

  try {
    await adminDirectus.request(updateItem('news', id, safePayload))
    
    // 3. Accurate Cache Purging based on Schema Routing rules
    const eventSlug = existingArticle.event_id?.slug
    if (eventSlug) {
      revalidatePath(`/events/${eventSlug}`) // Invalidate list tab
      revalidatePath(`/news/${eventSlug}/${payload.slug || existingArticle.slug}`) // Invalidate specific article
      await pingWebRevalidate({ slug: eventSlug, tags: ['collection:news', `news:${payload.slug || existingArticle.slug}`] })
    } else {
      await pingWebRevalidate({ tags: ['collection:news'] })
    }
    
    return { success: true as const }
  } catch (err: any) {
    if (err?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
      return { success: false as const, error: 'Slug is already in use.' }
    }
    return { success: false as const, error: 'Failed to update article.' }
  }
}

export async function uploadThumbnailAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { success: false as const, error: 'Unauthorized' }

  const file = formData.get('file') as File | null
  if (!file) return { success: false as const, error: 'No file provided' }

  // 1. Restrict MIME Types (Prevent SVG XSS or unexpected files)
  const allowedTypes =['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { success: false as const, error: 'Only JPG, PNG, and WEBP images are allowed' }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return { success: false as const, error: 'File size exceeds 5MB limit' }
  }

  try {
    const safeFormData = new FormData()
    safeFormData.append('file', file)

    const result = await adminDirectus.request(uploadFiles(safeFormData)) as { id: string }
    return { success: true as const, id: result.id }
  } catch (err: unknown) {
    return { success: false as const, error: 'Failed to upload thumbnail' }
  }
}