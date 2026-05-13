// --- Enums -----------------------------------------------------

export type EventStatus     = 'draft' | 'upcoming' | 'active' | 'finished' | 'cancelled'
export type MatchStatus     = 'upcoming' | 'live' | 'finished' | 'cancelled'
export type MatchType       = 'head_to_head' | 'solo' | 'open'
export type EngineType      = 'score_timed' | 'score_sets' | 'judge_scores' | 'finish_time' | 'manual_pick'
export type ScoringMethod   = 'avg' | 'sum' | 'drop_extremes'
export type TimerMode       = 'countdown' | 'stopwatch' | 'deadline'
export type ParticipantType = 'individual' | 'team'
export type NewsCategory    = 'announcement' | 'result' | 'news' | 'update'
export type UserRole        = 'SuperAdmin' | 'PJ Ormawa' | 'Administrator'

// --- Module types ----------------------------------------------

export type FormatModule =
  | { type: 'score_timed';  config: { score_label: string; has_periods: boolean; period_term?: string; period_count?: number } }
  | { type: 'score_sets';   config: { score_label: string; term: string; max_sets: number; sets_to_win: number } }
  | { type: 'judge_scores'; config: { num_judges: number; score_min: number; score_max: number; step: number; method: ScoringMethod } }
  | { type: 'finish_time';  config: { unit: 's' | 'ms'; rank_order: 'asc' | 'desc' } }
  | { type: 'manual_pick';  config: { allow_draw?: boolean; top_n?: number; ranked_order?: boolean } }
  | { type: 'timer';        config: { mode: TimerMode; duration?: number } }
  | { type: 'notes';        config: Record<string, never> }

// --- Canonical setLog entry ------------------------------------
// Written by ScoreSetsPanel.confirmSetWinner. Do NOT use other key names.

export type SetLogEntry = {
  set:       number           // 1-based set number
  homeScore: number
  awayScore: number
  winner:    'home' | 'away'
}

// --- Canonical timeLog entry -----------------------------------
// Written by FinishTimePanel. Always includes id from participants table.
// id is optional to remain compatible with legacy DB rows that predate this field.

export type TimeLogEntry = {
  id?:  string   // participant UUID - optional for legacy rows
  name: string
  time: string   // e.g. "1m 30s" or "1m 30s 250ms"
}

// --- Collections -----------------------------------------------

export type Event = {
  id: string
  name: string
  slug: string
  type: 'sport' | 'arts'
  status: EventStatus
  start_date: string | null
  end_date: string | null
  location: string | null
  description: string | null
  card_image: string | null    // UUID, pakai getAssetUrl()
  banner_image: string | null  // UUID, pakai getAssetUrl()
  is_published: boolean
  is_registration_open: boolean
  registration_end_date: string | null
  user_created: string
  created_at: string
  updated_at: string
}

export type CompetitionCategory = {
  id: string
  event_id: string
  format_id: string | null
  name: string
  participant_type: ParticipantType
  display_order: number
}

export type MatchFormat = {
  id: string
  event_id: string
  name: string
  match_type: MatchType
  modules: FormatModule[]
}

export type Institution = {
  id: string
  event_id: string
  name: string
  logo: string | null  // UUID, pakai getAssetUrl()
  color: string | null
}

export type Participant = {
  id: string
  competition_category_id: string
  institution_id: Institution | null  // dipetakan dari API response, lihat catatan schema
  name: string
  members: unknown[] | null
  seed: number | null
  notes: string
}

export type Match = {
  id: string
  competition_category_id: string
  round: string | null
  match_name: string | null
  venue: string | null
  scheduled_at: string | null
  home_participant_id: string | null
  away_participant_id: string | null
  winner: string | null
  rankings: { rank: number; id: string; name: string }[] | null
  live_state: LiveState | null
  status: MatchStatus
}

export type MatchParticipant = {
  id: string
  match_id: string
  participant_id: string
  position: number
  created_at: string
}

export type LiveState = {
  matchStatus: MatchStatus
  winner: string | null
  rankings: { rank: number; id: string; name: string }[] | null
  notes: string
  timerSecs: number
  timerTarget: string | null
  timerLastStarted: string | null
  timerRunning: boolean
  timerFlags: { label: string; secs: number }[]
  homeScore: number
  awayScore: number
  periodIdx: number
  periodPhase: 'idle' | 'active' | 'halftime'
  setIdx: number
  setPhase: 'idle' | 'active' | 'ending'
  setScore: [number, number]
  setsWon: [number, number]
  setLog: SetLogEntry[]
  pendingSetWinner: string | null
  judgeScores: number[]
  timeLog: TimeLogEntry[]
}

export type EventPhase = {
  id: string
  event_id: string
  label: string
  description: string
  date_start: string
  date_end: string | null
  time_start: string
  status: 'done' | 'current' | 'upcoming'
  display_order: number
}

export type NewsArticle = {
  id: string
  author_id: string
  event_id: string | null
  category: NewsCategory
  title: string
  slug: string
  excerpt: string | null
  thumbnail: string | null  // UUID, pakai getAssetUrl()
  content: string | null    // HTML dari Tiptap
  is_published: boolean
  published_at: string | null
}

export type ActivityLog = {
  id: string
  event_id: string | null
  user_id: string
  action: string
  entity: string
  entity_id: string | null
  description: string
  created_at: string
}

export type AppSettings = {
  id: string
  setting_key: string
  setting_value: string | null
  description: string | null
  updated_at: string
}