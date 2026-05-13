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

  let slug: string | undefined;
  let tags: string[] = [];
  try {
    const body = await req.json();
    slug = body?.slug;
    tags = body?.tags ?? [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Always revalidate the home page and events list
  revalidatePath('/', 'layout');
  revalidatePath('/events');
  revalidateTag('events');
  revalidateTag('global:stats');

  if (slug) {
    revalidateTag(`event:${slug}`);
    revalidateTag(`event:${slug}:news`);
    revalidateTag(`event:${slug}:matches`);
    revalidateTag(`event:${slug}:participants`);
    revalidatePath(`/events/${slug}`, 'layout');
  }

  if (tags.length > 0) {
    tags.forEach(tag => revalidateTag(tag));
  }

  return NextResponse.json({ 
    ok: true, 
    revalidated: {
      slug: slug ?? 'none',
      tags: tags
    }
  });
}