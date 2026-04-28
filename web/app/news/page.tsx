/**
 * /news — Editorial news index page
 * File must be named page.tsx (lowercase) for Next.js to pick it up as a route.
 */

import NewsPageClient from "./_components/NewsPageClient";
import { getNews, getEventsWithRecentNews } from "@/lib/directus";

export const metadata = {
  title: "News — IPB LSA",
  description: "Latest stories and event coverage from IPB LSA.",
};

export default async function NewsPage() {
  const [latestNews, events] = await Promise.all([
    getNews({ limit: 5 }),
    getEventsWithRecentNews(),
  ]);

  return <NewsPageClient latestNews={latestNews} events={events} />;
}