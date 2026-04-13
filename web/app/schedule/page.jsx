import { getMatches } from "@/lib/directus";
import SchedulePageClient from "./_components/SchedulePageClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const matches = await getMatches();

  return (
    <main>
      <SchedulePageClient initialMatches={matches} />
    </main>
  );
}
