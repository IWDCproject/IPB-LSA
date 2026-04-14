import AboutPanel from "./AboutPanel";
import TimelinePanel from "./TimelinePanel";
import CountdownPanel from "./CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "./MatchesPanels";
import LatestStoriesSection from "./LatestStoriesSection";

export default function OverviewTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const upcoming = (event.matches ??[]).filter((m: any) => m.status === "upcoming" || m.status === "live");
  const finished = (event.matches ??[]).filter((m: any) => m.status === "finished");
  const showCountdown = !!(event.is_registration_open && event.registration_end_date);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 2-column grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
        gap: 16,
        alignItems: "stretch",
      }}>
        {/* Left: description + timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AboutPanel event={event} />
          <TimelinePanel phases={event.phases ??[]} />
        </div>

        {/* Right: countdown (if open) + upcoming + results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
          {showCountdown && (
            <CountdownPanel
              deadline={event.registration_end_date}
              registrationUrl={event.registration_url}
            />
          )}
          <UpcomingMatchesPanel upcoming={upcoming} />
          <LatestResultsPanel finished={finished} />
        </div>
      </div>

      {/* News */}
      {event.news?.length > 0 && (
        <LatestStoriesSection news={event.news} eventSlug={event.slug} />
      )}
    </div>
  );
}