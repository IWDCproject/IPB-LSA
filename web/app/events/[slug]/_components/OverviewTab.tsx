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

  // Define the countdown component once to keep code clean
  const countdownElement = showCountdown && (
    <CountdownPanel
      deadline={event.registration_end_date}
      registrationUrl={event.registration_url}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
        gap: 16,
        alignItems: "stretch",
      }}>
        {/* COLUMN 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isMobile && countdownElement} {/* Renders here on Mobile */}
          <AboutPanel event={event} />
          <TimelinePanel phases={event.phases ?? []} />
        </div>

        {/* COLUMN 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isMobile && countdownElement} {/* Renders here on Desktop */}
          
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
        <LatestStoriesSection news={event.news} eventSlug={event.slug} isMobile={isMobile} />
      )}
    </div>
  );
}