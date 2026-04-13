import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/directus";
import EventDetailClient from "./EventDetailClient";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEventDetail(params.slug);
  if (!event) notFound();
  return <EventDetailClient event={event} />;
}