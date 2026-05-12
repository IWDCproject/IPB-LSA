
import { DEFAULT_LIVE_STATE } from '@/lib/liveStateDefaults'
import type { LiveState, MatchFormat, Participant } from '@/types/directus'

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

const MOCK_NAMES = [
  'Gilang Muhamad W.',
  'Arisyida L. A.',
  'Budi Santoso',
  'Citra Dewi',
]

/**
 * Returns a stable set of mock Participant objects for the given matchType.
 * solo → 1 participant, head_to_head → 2, anything else → 4.
 */
export function getMockParticipants(matchType: string): Participant[] {
  const count =
    matchType === 'solo'         ? 1 :
    matchType === 'head_to_head' ? 2 : 4

  return MOCK_NAMES.slice(0, count).map((name, i) => ({
    id:   `preview-p${i + 1}`,
    name,
  })) as Participant[]
}

// ---------------------------------------------------------------------------
// LiveState
// ---------------------------------------------------------------------------

/**
 * Returns a fresh copy of liveStateDefaults so each preview starts clean and
 * mutations in one session don't bleed into another.
 */
export function getMockLiveState(): LiveState {
  return structuredClone(DEFAULT_LIVE_STATE)
}

// ---------------------------------------------------------------------------
// MatchFormat
// ---------------------------------------------------------------------------

/**
 * Converts the flat format-builder store state into the nested MatchFormat
 * shape that real engine panels read from `format.modules[0].config`.
 *
 * `engine` is typed `any` intentionally — the store uses a discriminated union
 * and we want a single helper that handles all branches without importing the
 * store type here.
 */
export function buildMockFormat(engine: any, matchType: string): MatchFormat {
  return {
    id:         'preview',
    name:       'Preview Format',
    match_type: matchType,
    modules:    [buildMockModule(engine)],
  } as MatchFormat
}

function buildMockModule(engine: any) {
  switch (engine.type as string) {

    case 'finish_time':
      return {
        type:   'finish_time',
        config: {
          unit:       engine.unit       ?? 's',
          rank_order: engine.rankOrder  ?? 'asc',
        },
      }

    case 'score_timed':
      return {
        type:   'score_timed',
        config: {
          target_score: engine.targetScore ?? 10,
          time_limit:   engine.timeLimit   ?? 120,
          rank_order:   engine.rankOrder   ?? 'desc',
        },
      }

    case 'score_sets':
      return {
        type:   'score_sets',
        config: {
          sets_to_win:    engine.setsToWin    ?? 3,
          points_per_set: engine.pointsPerSet ?? 21,
          rank_order:     engine.rankOrder    ?? 'desc',
        },
      }

    case 'judge_scores':
      return {
        type:   'judge_scores',
        config: {
          judges:     engine.judges     ?? 3,
          max_score:  engine.maxScore   ?? 10,
          rank_order: engine.rankOrder  ?? 'desc',
        },
      }

    case 'manual_pick':
      return {
        type:   'manual_pick',
        config: {},
      }

    default:
      return { type: engine.type, config: {} }
  }
}