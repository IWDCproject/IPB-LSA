// web/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const SECRET = process.env.REVALIDATE_SECRET

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (req.headers.get('x-revalidate-secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let slug: string | undefined
  try {
    const body = await req.json()
    slug = body?.slug
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  revalidateTag('events')
  revalidatePath('/', 'layout')
  revalidatePath('/events')

  if (slug) {
    revalidateTag(`event-${slug}`)
    revalidatePath(`/events/${slug}`, 'layout')
  }

  return NextResponse.json({ ok: true, revalidated: slug ?? 'all' })
}