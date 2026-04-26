import { Suspense }      from "react";
import { notFound }      from "next/navigation";
import type { Metadata } from "next";
import { getEventDetail, getAssetUrl } from "@/lib/directus";
import EventDetailClient from "./EventDetailClient";

// ─── generateMetadata ─────────────────────────────────────────────────────────
// Runs server-side, shares the same getEventDetail call as the page render.
// Next.js de-duplicates the fetch via its built-in request memoisation, so
// there is no double-fetch cost.
export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const event = await getEventDetail(params.slug);
  if (!event) return {};

  const title       = `${event.name} — ${event.organiser}`;
  const description = event.description?.slice(0, 160) ?? title;
  const ogImage     = event.banner_image
    ? getAssetUrl(event.banner_image)
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: event.name }],
      }),
      type: "website",
    },
    twitter: {
      card:        ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// EventDetailClient uses useSearchParams(), which requires a Suspense boundary
// at or above the client component. Wrapping here satisfies that requirement
// without adding any visible loading UI — the server-rendered shell is already
// in place when the client hydrates.
export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEventDetail(params.slug);
  if (!event) notFound();

  return (
    <Suspense>
      <EventDetailClient event={event} />
    </Suspense>
  );
}