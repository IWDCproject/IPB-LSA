import { redirect } from 'next/navigation';

export default function EventNewsRedirect({ params }: { params: { eventSlug: string } }) {
  redirect(`/events/${params.eventSlug}?tab=news`);
}