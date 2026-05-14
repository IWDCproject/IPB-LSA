import { createDirectus, rest, staticToken } from '@directus/sdk'

/**
 * Admin Directus SDK — server only, never exposed to client.
 * Uses a static token to bypass permission checks for internal logging and system tasks.
 */
export const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())
