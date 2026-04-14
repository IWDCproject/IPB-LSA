import AboutPanel from "./AboutPanel";
import TimelinePanel from "./TimelinePanel";
import CountdownPanel from "./CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "./MatchesPanels";
import LatestStoriesSection from "./LatestStoriesSection";

export default function OverviewTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const upcoming = (event.matches ?? []).filter((m: any) => m.status === "upcoming" || m.status === "live");
  const finished = (event.matches ?? []).filter((m: any) => m.status === "finished");
  
  const isUpcomingEvent = event.status === "upcoming";
  const showCountdown = !!(event.is_registration_open && event.registration_end_date);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
        gap: 16,
        alignItems: "stretch", // Ensures the columns have equal height
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AboutPanel event={event} />
          <TimelinePanel phases={event.phases ?? []} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {showCountdown && (
            <CountdownPanel
              deadline={event.registration_end_date}
              registrationUrl={event.registration_url}
            />
          )}
          
          {/* FIX: Use flex-grow and flex container to force the child to fill the space */}
          <div style={{ 
            flex: isUpcomingEvent ? 1 : "unset", 
            display: "flex", 
            flexDirection: "column" 
          }}>
            <UpcomingMatchesPanel upcoming={upcoming} />
          </div>

          {!isUpcomingEvent && finished.length > 0 && (
            <LatestResultsPanel finished={finished} />
          )}
        </div>
      </div>

      {event.news?.length > 0 && (
        <LatestStoriesSection news={event.news} eventSlug={event.slug} />
      )}
    </div>
  );
}