import { createDirectus, rest, realtime, authentication } from '@directus/sdk'

export const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(authentication('session'))
  .with(rest())
  .with(realtime())

export const getAssetUrl = (uuid: string | null | undefined): string | null =>
  uuid ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${uuid}` : null