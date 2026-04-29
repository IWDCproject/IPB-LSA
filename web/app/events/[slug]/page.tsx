import { Suspense }      from "react";
import { notFound }      from "next/navigation";
import type { Metadata } from "next";
import { getEventDetail, getAssetUrl } from "@/lib/directus";
import EventDetailClient from "./EventDetailClient";


export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const event = await getEventDetail(params.slug);
  if (!event) return {};

  const title       = `${event.name} by ${event.organiser}`;
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

// --- Page ---------------------------------------------------------------------

export default async function EventPage({ 
  params, 
  searchParams 
}: { 
  params: { slug: string }; 
  searchParams: { tab?: string }; 
}) {
  const event = await getEventDetail(params.slug);
  if (!event) notFound();

  // Get the tab from the URL on the server side
  const initialTab = (searchParams.tab as any) || "overview";

  return (
    <Suspense>
      <EventDetailClient event={event} initialTab={initialTab} />
    </Suspense>
  );
}