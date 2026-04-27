import { redirect } from 'next/navigation';
import Footer from "@/components/Footer";


export default function EventNewsRedirect({ params }: { params: { eventSlug: string } }) {
  redirect(`/events/${params.eventSlug}?tab=news`);
}