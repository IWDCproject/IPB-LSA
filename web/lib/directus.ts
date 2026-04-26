// @ts-check
import { createDirectus, rest, readItems, aggregate } from '@directus/sdk';
import type {
  MappedEvent,
  MappedMatch,
  MappedParticipant,
  MappedNews,
  DirectusPhase,
  CategoryWithParticipants,
  MatchLiveState,
  ParticipantJunction,
  MappedCompetitionCategory,
  FormatModule,
  MemberEntry,
  MappedInstitution,
  RawAsset,
} from '../app/events/[slug]/_types';

// ─── Directus clients ─────────────────────────────────────────────────────────

// Live data (scores, match state) — always fresh
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL as string)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" as RequestCache }) }));

// Stable data (news, participants, phases) — revalidate every 60s.
// Do not merge into a single client — the dual-client pattern is intentional.
const directusCached = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL as string)
  .with(rest({ onRequest: (options) => ({ ...options, next: { revalidate: 60 } }) }));

export default directus;

export const getAssetUrl = (asset: RawAsset | string | null | undefined): string | null => {
  if (!asset) return null;
  const id = typeof asset === 'object' ? asset.id : asset;
  if (!id || id === 'null') return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  const qs = typeof asset === 'object' && asset.uploaded_on
    ? `?v=${new Date(asset.uploaded_on).getTime()}`
    : '';
  return `${base}/assets/${id}${qs}`;
};

// ─── STATUS_MAP ───────────────────────────────────────────────────────────────
// Maps raw Directus status strings (including legacy aliases) to the three
// canonical frontend values. This is the single source of truth for status
// normalization — a change here propagates everywhere automatically.
// The EventDetailHeader status dictionaries use the canonical keys that this
// map produces: "upcoming" | "ongoing" | "concluded".
export const STATUS_MAP: Record<string, "upcoming" | "ongoing" | "concluded"> = {
  upcoming:  'upcoming',
  ongoing:   'ongoing',
  active:    'ongoing',   // alias — remove if unused in Directus
  concluded: 'concluded',
  finished:  'concluded', // alias — remove if unused in Directus
  past:      'concluded', // alias — remove if unused in Directus
};

// ─── Mapping helpers ──────────────────────────────────────────────────────────

const mapInstitution = (raw: any): MappedInstitution | null => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id:       raw.id,
    name:     raw.name,
    logo_url: getAssetUrl(raw.logo),
  };
};

const mapParticipant = (p: any): MappedParticipant | null => {
  if (!p || typeof p !== 'object') return null;

  let parsedMembers: MemberEntry[] | null = null;
  if (typeof p.members === 'string') {
    try { parsedMembers = JSON.parse(p.members); } catch { /* leave null */ }
  } else if (Array.isArray(p.members)) {
    parsedMembers = p.members;
  }

  return {
    ...p,
    members:     parsedMembers,
    institution: p.institution_id ? mapInstitution(p.institution_id) : null,
  };
};

const MATCH_FIELDS = [
  '*',
  'competition_category_id.*',
  'competition_category_id.event_id.*',
  'competition_category_id.format_id.*',
  'home_participant_id.*',
  'home_participant_id.institution_id.*',
  'away_participant_id.*',
  'away_participant_id.institution_id.*',
  'participants.id',
  'participants.participant_id.*',
  'participants.participant_id.institution_id.*',
];

const mapMatch = (m: any): MappedMatch => {
  const cat = m.competition_category_id;
  const fmt = cat?.format_id;
  const modules: FormatModule[] = typeof fmt?.modules === 'string'
    ? JSON.parse(fmt.modules)
    : (fmt?.modules ?? []);

  const junctionParts: ParticipantJunction[] = (m.participants ?? []).map((j: any) => ({
    ...j,
    participant_id: mapParticipant(j.participant_id),
  }));

  const home = mapParticipant(m.home_participant_id) || (junctionParts[0]?.participant_id ?? null);
  const away = mapParticipant(m.away_participant_id) || (junctionParts[1]?.participant_id ?? null);

  const live: MatchLiveState = m.live_state ?? {};
  if (live.timeLog && Array.isArray(live.timeLog)) {
    live.timeLog = live.timeLog.map((logEntry: any) => {
      const pid = logEntry.participant_id?.id || logEntry.participant_id || logEntry.id;
      const found = junctionParts.find(jp => jp.participant_id?.id === pid);
      return {
        ...logEntry,
        institution: found?.participant_id?.institution || logEntry.institution || null,
      };
    });
  }

  const mappedCategory: MappedCompetitionCategory = {
    ...cat,
    format_id: fmt ? { ...fmt, modules } : null,
  };

  return {
    ...m,
    competition_category: mappedCategory,
    home_participant:     home,
    away_participant:     away,
    participants:         junctionParts,
    live_state:           live,
  };
};

const NEWS_FIELDS = ['*', 'thumbnail.*', 'event_id.name'];

const mapNews = (n: any): MappedNews => ({
  ...n,
  thumbnail_url:    getAssetUrl(n.thumbnail),
  thumbnail_width:  n.thumbnail?.width  ?? null,
  thumbnail_height: n.thumbnail?.height ?? null,
  category:         n.category          ?? null,
  // Guard against Directus returning a bare ID string when the relation isn't
  // populated (shouldn't happen given NEWS_FIELDS, but be defensive).
  event_id: typeof n.event_id === 'object' && n.event_id !== null ? n.event_id : null,
});

// ─── Exported data functions ──────────────────────────────────────────────────

export const getMatches = async (): Promise<MappedMatch[]> => {
  try {
    const res = await directus.request(readItems('matches', {
      fields: MATCH_FIELDS,
      filter: { status: { _in: ['live', 'upcoming', 'finished'] } },
      sort:   ['status', 'scheduled_at'],
    }));
    return (res as any[]).map(mapMatch);
  } catch { return []; }
};

export const getEventsForListing = async () => {
  try {
    return await directusCached.request(readItems('events', {
      filter: { is_published: { _eq: true } },
      fields: ['*', 'user_created.organisation_name', 'card_image.*', 'banner_image.*'],
      sort:   ['start_date'],
      limit:  -1,
    }));
  } catch { return []; }
};

export const getEventDetail = async (slug: string): Promise<MappedEvent | null> => {
  try {
    const [events, phases, rawMatches, rawNews, participants] = await Promise.all([
      // Live client — event status and match scores change at any time
      directus.request(readItems('events', {
        filter: { slug: { _eq: slug } },
        fields: ['*', 'banner_image.*', 'card_image.*', 'user_created.organisation_name'],
        limit:  1,
      })),
      // Cached client — phases are stable (rarely change)
      directusCached.request(readItems('event_phases', {
        filter: { event_id: { slug: { _eq: slug } } },
        sort:   ['display_order'],
      })),
      // Live client — match scores and status change frequently
      directus.request(readItems('matches', {
        filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } },
        fields: MATCH_FIELDS,
        sort:   ['status', 'scheduled_at'],
        limit:  -1, // fetch all matches — hard limit of 50 would silently truncate
      })),
      // Cached client — news teaser (4 items) is stable data
      directusCached.request(readItems('news', {
        filter: {
          event_id:     { slug: { _eq: slug } },
          is_published: { _eq: true },
        },
        fields: NEWS_FIELDS,
        sort:   ['-published_at'],
        limit:  4,
      })),
      // Cached client — participants are stable (60s revalidation)
      getParticipantsByEvent(slug),
    ]);

    const event = (events as any[])[0];
    if (!event) return null;

    return {
      ...event,
      // Apply STATUS_MAP so all downstream components receive canonical status values.
      // EventDetailHeader uses canonical keys ("upcoming" | "ongoing" | "concluded").
      status:     STATUS_MAP[event.status] ?? 'concluded',
      banner_url: getAssetUrl(event.banner_image),
      organiser:  event.user_created?.organisation_name ?? '',
      phases:     phases as DirectusPhase[],
      matches:    (rawMatches as any[]).map(mapMatch),
      news:       (rawNews as any[]).map(mapNews),
      participants,
    } as MappedEvent;
  } catch { return null; }
};

// ─── News ─────────────────────────────────────────────────────────────────────

/** Cheap aggregate-only fetch for the News tab skeleton.
 *  Returns the number of items on the requested page so the skeleton can render
 *  the exact right number of cards. Fire in parallel with getNewsByEvent. */
export const getNewsCountByEvent = async (
  eventSlug: string,
  page     = 1,
  pageSize = 6,
): Promise<{ pageCount: number; total: number; totalPages: number; error?: true }> => {
  const filter = {
    event_id:     { slug: { _eq: eventSlug } },
    is_published: { _eq: true },
  };
  try {
    const countResult = await directusCached.request(aggregate('news', {
      aggregate: { count: '*' },
      query:     { filter },
    }));
    const total      = Number((countResult as any)?.[0]?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize);
    const offset     = (page - 1) * pageSize;
    return {
      pageCount:  Math.min(pageSize, Math.max(0, total - offset)),
      total,
      totalPages,
    };
  } catch {
    return { pageCount: pageSize, total: 0, totalPages: 0, error: true };
  }
};

/** Paginated news fetch for the News tab (items only). */
export const getNewsByEvent = async (
  eventSlug: string,
  page     = 1,
  pageSize = 6,
): Promise<{ items: MappedNews[]; error?: true }> => {
  const filter = {
    event_id:     { slug: { _eq: eventSlug } },
    is_published: { _eq: true },
  };
  try {
    const items = await directusCached.request(readItems('news', {
      filter,
      fields: NEWS_FIELDS,
      sort:   ['-published_at'],
      limit:  pageSize,
      offset: (page - 1) * pageSize,
    }));
    return { items: (items as any[]).map(mapNews) };
  } catch {
    return { items: [], error: true };
  }
};

// ─── Participants ─────────────────────────────────────────────────────────────

const PARTICIPANT_FIELDS = [
  '*',
  'institution_id.*',
  'institution_id.logo.*',
  'competition_category_id.id',
  'competition_category_id.name',
  'competition_category_id.display_order',
];

export const getParticipantsByEvent = async (
  eventSlug: string,
): Promise<CategoryWithParticipants[]> => {
  try {
    const [categories, rawParticipants] = await Promise.all([
      directusCached.request(readItems('competition_categories', {
        filter: { event_id: { slug: { _eq: eventSlug } } },
        fields: ['id', 'name', 'display_order'],
        sort:   ['display_order', 'name'],
        limit:  -1,
      })),
      directusCached.request(readItems('participants', {
        filter: { competition_category_id: { event_id: { slug: { _eq: eventSlug } } } },
        fields: PARTICIPANT_FIELDS,
        sort:   ['name'],
        limit:  -1,
      })),
    ]);

    const participants = (rawParticipants as any[]).map(mapParticipant).filter(Boolean) as MappedParticipant[];

    return (categories as any[]).map(cat => ({
      category:     cat,
      participants: participants.filter(p => {
        const catId = typeof p.competition_category_id === 'object'
          ? (p.competition_category_id as any)?.id
          : p.competition_category_id;
        return catId === cat.id;
      }),
    }));
  } catch {
    return [];
  }
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const getEvents = async () => getEventsForListing();

export const getStats = async () => {
  try {
    const [e, i, p] = await Promise.all([
      directus.request(readItems('events')),
      directus.request(readItems('institutions')),
      directus.request(readItems('participants')),
    ]);
    return {
      eventsCount:      (e as any[]).length,
      institutionsCount: (i as any[]).length,
      participantsCount: (p as any[]).length,
    };
  } catch {
    return { eventsCount: 0, institutionsCount: 0, participantsCount: 0 };
  }
};

export const getNews = async ({ limit = 5 }: { limit?: number } = {}): Promise<MappedNews[]> => {
  const items = await directusCached.request(readItems('news', {
    filter: { is_published: { _eq: true } },
    fields: NEWS_FIELDS,
    sort:   ['-published_at'],
    limit,
  }));
  return (items as any[]).map(mapNews);
};

export const getEventsWithRecentNews = async () => {
  try {
    const events = await directusCached.request(readItems('events', {
      filter: { is_published: { _eq: true } },
      fields: ['id', 'name', 'slug', 'status', 'start_date', 'banner_image.*'],
      sort:   ['start_date'],
      limit:  -1,
    }));

    const eventsWithNews = await Promise.all(
      (events as any[]).map(async (event) => {
        const items = await directusCached.request(readItems('news', {
          filter: {
            event_id:     { slug: { _eq: event.slug } },
            is_published: { _eq: true },
          },
          fields: NEWS_FIELDS,
          sort:   ['-published_at'],
          limit:  6,
        }));
        return {
          id:           event.id,
          name:         event.name,
          slug:         event.slug,
          banner_image: event.banner_image ?? null,
          banner_url:   getAssetUrl(event.banner_image),
          status:       STATUS_MAP[event.status] ?? 'concluded',
          news:         (items as any[]).map(mapNews),
        };
      })
    );

    return eventsWithNews.filter((e) => e.news.length > 0);
  } catch { return []; }
};

export const getAllNewsFiltered = async ({
  page     = 1,
  pageSize = 24,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter   = {} as any,
  sort     = '-published_at',
}: {
  page?:     number;
  pageSize?: number;
  // Intentionally `any` — callers pass a `DirectusNewsFilter` interface that
  // lacks an index signature, which makes it incompatible with a typed Record.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?:   any;
  sort?:     string;
} = {}): Promise<{ items: MappedNews[]; total: number; totalPages: number }> => {
  const FULL_FIELDS = ['*', 'thumbnail.*', 'event_id.name', 'event_id.slug', 'event_id.status'];
  try {
    const [items, countResult] = await Promise.all([
      directusCached.request(readItems('news', {
        filter,
        fields: FULL_FIELDS,
        sort:   [sort],
        limit:  pageSize,
        offset: (page - 1) * pageSize,
      })),
      directusCached.request(aggregate('news', {
        aggregate: { count: '*' },
        query:     { filter },
      })),
    ]);
    const total = Number((countResult as any)?.[0]?.count ?? 0);
    return {
      items:      (items as any[]).map(mapNews),
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return { items: [], total: 0, totalPages: 0 };
  }
};