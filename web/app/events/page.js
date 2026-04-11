import { getEventsForListing } from "@/lib/directus";
import EventPageClient from "./_components/EventPageClient";

export const revalidate = 60;

export default async function EventPage() {
  const events = await getEventsForListing();
  return <EventPageClient events={events} />;
}