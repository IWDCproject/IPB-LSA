import { getMatches, getNews } from "@/lib/directus";
import SchedulePageClient from "./_components/SchedulePageClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const matches = await getMatches();
  const news = await getNews({ limit: 5 });

  return (
    <main>
      <SchedulePageClient initialMatches={matches} initialNews={news} />
    </main>
  );
}
