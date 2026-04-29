// --- Tab navigation -----------------------------------------------------------
export type TabKey    = "overview" | "matches" | "participants" | "news";
export type AnimPhase = "entering" | "idle";

// --- Canonical event status values (output of STATUS_MAP) --------------------
export type EventStatus = "upcoming" | "ongoing" | "concluded";

// --- Directus raw shapes (server response before mapping) ---------------------
export interface RawAsset {
  id:          string;
  uploaded_on?: string;
}

export interface RawInstitution {
  id:   string;
  name: string;
  logo: RawAsset | null;
}

export interface RawParticipant {
  id:                     string;
  name:                   string;
  members:                string | MemberEntry[] | null;
  institution_id:         RawInstitution | null;
  competition_category_id: { id: string; name: string; display_order: number } | string;
}

export interface RawNews {
  id:            string;
  title:         string;
  slug:          string;
  excerpt:       string | null;
  content:       string | null;
  published_at:  string | null;
  is_published:  boolean;
  thumbnail:     RawAsset | null;
  event_id:      { name: string; slug?: string; status?: string } | string | null;
}

export interface RawMatch {
  id:                     string;
  status:                 string;
  scheduled_at:           string | null;
  live_state:             MatchLiveState | null;
  competition_category_id: RawCompetitionCategory | null;
  home_participant_id:    RawParticipant | null;
  away_participant_id:    RawParticipant | null;
  participants:           Array<{ id: string; participant_id: RawParticipant }>;
}

export interface RawCompetitionCategory {
  id:           string;
  name:         string;
  display_order?: number;
  event_id:     { id: string; name: string; slug: string } | null;
  format_id:    RawFormat | null;
}

export interface RawFormat {
  id:      string;
  name:    string;
  modules: string | FormatModule[];
}

export interface DirectusPhase {
  id:            string | number;
  label:         string;
  status:        string;
  date_start:    string | null;
  time_start:    string | null;
  description:   string | null;
  display_order: number;
  event_id:      string;
}

// --- Mapped / normalized shapes (what components receive) ---------------------

export interface MemberEntry {
  name:   string;
  role?:  string;
  email?: string;
}

export interface MappedInstitution {
  id:       string;
  name:     string;
  logo_url: string | null;
}

export interface MappedParticipant {
  id:                     string;
  name:                   string;
  members:                MemberEntry[] | null;
  institution:            MappedInstitution | null;
  competition_category_id: { id: string; name: string; display_order: number } | string;
}

export interface MappedNews {
  id:               string;
  title:            string;
  slug:             string;
  excerpt:          string | null;
  content:          string | null;
  published_at:     string | null;
  is_published:     boolean;
  thumbnail_url:    string | null;
  thumbnail_width:  number | null;
  thumbnail_height: number | null;
  category:         string | null;
  // Always an object after mapping — NEWS_FIELDS always requests event_id.name,
  // so Directus never returns a bare ID string here. The string variant in the
  // raw RawNews shape is intentionally excluded from the mapped type.
  event_id:         { name: string; slug?: string; status?: string } | null;
}

export interface FormatModule {
  type:    string;
  [key: string]: unknown;
}

export interface MappedCompetitionCategory {
  id:        string;
  name:      string;
  event_id:  { id: string; name: string; slug: string } | null;
  format_id: {
    id:         string;
    name:       string;
    modules:    FormatModule[];
    /** "head_to_head" | "open" | etc. — controls which participant layout to render */
    match_type?: string | null;
  } | null;
}

export interface MatchLiveState {
  winner?:     string | null;
  homeScore?:  number;
  awayScore?:  number;
  setScore?:   [number, number];
  setLog?:     Array<{ home: number; away: number }>;
  judgeScores?: number[];
  timeLog?:    TimeLogEntry[];
  [key: string]: unknown;
}

export interface TimeLogEntry {
  participant_id: string | { id: string };
  institution:    MappedInstitution | null;
  [key: string]: unknown;
}

export interface ParticipantJunction {
  id:             string;
  participant_id: MappedParticipant;
}

export interface MappedMatch {
  id:                   string;
  status:               string;
  scheduled_at:         string | null;
  /** Free-text round label, e.g. "Quarterfinal", "Pool A" */
  round:                string | null;
  /** Venue / location string displayed in match rows */
  venue:                string | null;
  /** Top-level winner field (participant UUID or name), separate from live_state.winner */
  winner:               string | null;
  live_state:           MatchLiveState;
  competition_category: MappedCompetitionCategory;
  home_participant:     MappedParticipant | null;
  away_participant:     MappedParticipant | null;
  participants:         ParticipantJunction[];
}

export interface CategoryWithParticipants {
  category:     { id: string; name: string; display_order: number };
  participants: MappedParticipant[];
}

export interface ContactPerson {
  name:    string;
  contact: string;
}

export interface MappedEvent {
  id:                    string;
  name:                  string;
  slug:                  string;
  status:                EventStatus;
  description:           string | null;
  location:              string | null;
  start_date:            string | null;
  end_date:              string | null;
  registration_end_date: string | null;
  registration_url:      string | null;
  is_registration_open:  boolean;
  guidebook_url:         string | null;
  instagram_url:         string | null;
  url_youtube:           string | null;
  contact_person:        ContactPerson[];
  banner_image:          RawAsset | null;
  banner_url:            string | null;
  card_image:            RawAsset | null;
  organiser:             string;
  phases:                DirectusPhase[];
  matches:               MappedMatch[];
  news:                  MappedNews[];
  participants:          CategoryWithParticipants[];
  [key: string]: unknown;
}