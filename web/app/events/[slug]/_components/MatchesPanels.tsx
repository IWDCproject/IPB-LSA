import { MatchTable } from "@/app/_components/match-stuff/MatchTable";
import { PanelTitle, EmptyState } from "./Panel";

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden",
};

interface Props {
  upcoming: any[];
  finished: any[];
  isMobile: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export function UpcomingMatchesPanel({ upcoming, isMobile }: Pick<Props, "upcoming" | "isMobile">) {
  if (!upcoming.length) {
    return (
      <div style={{ ...CARD, padding: "24px 28px" }}>
        <PanelTitle>Upcoming Matches</PanelTitle>
        <EmptyState message="No Info Yet!" />
      </div>
    );
  }

  return (
    <div style={CARD}>
      <MatchTable
        matches={upcoming.slice(0, 12)}
        groupBy="category"
        showGroupFilter={false}
        onGroupByChange={noop}
        title="Upcoming Matches"
        isMobile={isMobile}
      />
    </div>
  );
}

export function LatestResultsPanel({ finished, isMobile }: Pick<Props, "finished" | "isMobile">) {
  if (!finished.length) {
    return (
      <div style={{ ...CARD, padding: "24px 28px" }}>
        <PanelTitle>Latest Results</PanelTitle>
        <EmptyState message="No results yet." />
      </div>
    );
  }

  return (
    <div style={CARD}>
      <MatchTable
        matches={finished.slice(0, 12)}
        groupBy="category"
        showGroupFilter={false}
        onGroupByChange={noop}
        title="Latest Results"
        isMobile={isMobile}
      />
    </div>
  );
}