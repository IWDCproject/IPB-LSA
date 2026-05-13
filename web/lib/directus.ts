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

// --- Directus clients ---------------------------------------------------------
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;

/**
 * Unified fetcher for Directus that handles Next.js caching and tagging.
 */
async function fetchDirectus<T>(
  request: any,
  options: { tags?: string[]; revalidate?: number | false } = {},
): Promise<T> {
  const { tags = [], revalidate = 60 } = options;

  const client = createDirectus<any>(DIRECTUS_URL).with(
    rest({
      onRequest: (opts) => ({
        ...opts,
        next: { revalidate, tags },
      }),
    }),
  );
  return client.request(request) as Promise<T>;
}

/**
 * Live client for cases where we absolutely cannot use the helper 
 * (e.g. non-Next.js environments or specific SDK features).
 */
const directus = createDirectus<any>(DIRECTUS_URL).with(
  rest({ onRequest: (options) => ({ ...options, cache: 'no-store' as RequestCache }) }),
);

export default directus;

export const getAssetUrl = (
  asset: RawAsset | string | null | undefined,
  opts?: { width?: number; height?: number; quality?: number; format?: string },
): string | null => {
  if (!asset) return null;
  const id = typeof asset === 'object' ? asset.id : asset;
  if (!id || id === 'null') return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:7777';
  const params = new URLSearchParams();
  if (typeof asset === 'object' && asset.uploaded_on) {
    params.set('v', String(new Date(asset.uploaded_on).getTime()));
  }
  if (opts?.width)   params.set('width',   String(opts.width));
  if (opts?.height)  params.set('height',  String(opts.height));
  if (opts?.quality) params.set('quality', String(opts.quality));
  if (opts?.format)  params.set('format',  opts.format);
  const qs = params.size > 0 ? `?${params.toString()}` : '';
  return `${base}/assets/${id}${qs}`;
};

// --- STATUS_MAP ---------------------------------------------------------------
export const STATUS_MAP: Record<string, "upcoming" | "ongoing" | "concluded"> = {
  upcoming:  'upcoming',
  ongoing:   'ongoing',
  active:    'ongoing',
  concluded: 'concluded',
  finished:  'concluded',
  past:      'concluded',
};

// --- Mapping helpers ----------------------------------------------------------

const mapInstitution = (raw: any): MappedInstitution | null => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id:       raw.id,
    name:     raw.name,
    color:    raw.color,
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
  'id', 'status', 'scheduled_at', 'venue', 'match_name', 'round',
  'home_score', 'away_score', 'timer_secs', 'rankings', 'winner', 'live_state',
  'competition_category_id.id',
  'competition_category_id.name',
  'competition_category_id.event_id.id',
  'competition_category_id.event_id.name',
  'competition_category_id.event_id.slug',
  'competition_category_id.event_id.card_image',
  'competition_category_id.event_id.user_created.organisation_name',
  'competition_category_id.format_id.id',
  'competition_category_id.format_id.name',
  'competition_category_id.format_id.match_type',
  'competition_category_id.format_id.modules',
  'home_participant_id.id',
  'home_participant_id.name',
  'home_participant_id.institution_id.id',
  'home_participant_id.institution_id.name',
  'home_participant_id.institution_id.logo',
  'away_participant_id.id',
  'away_participant_id.name',
  'away_participant_id.institution_id.id',
  'away_participant_id.institution_id.name',
  'away_participant_id.institution_id.logo',
  'participants.id',
  'participants.position',
  'participants.participant_id.id',
  'participants.participant_id.name',
  'participants.participant_id.institution_id.id',
  'participants.participant_id.institution_id.name',
  'participants.participant_id.institution_id.logo',
];

const mapMatch = (m: any): MappedMatch => {
  const cat = m.competition_category_id;
  const fmt = cat?.format_id;
  let modules: FormatModule[] = [];
  if (typeof fmt?.modules === 'string') {
    try { modules = JSON.parse(fmt.modules); }
    catch (e) { console.error('[mapMatch] Invalid JSON in fmt.modules:', e); }
  } else {
    modules = fmt?.modules ?? [];
  }

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

  if (cat && !fmt) {
    console.warn('[mapMatch] match', m.id, 'has no format_id - scoring will be unavailable for category', cat.id);
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

const NEWS_LIST_FIELDS = [
  'id', 'title', 'slug', 'excerpt', 'published_at', 'is_published',
  'thumbnail.id', 'thumbnail.width', 'thumbnail.height',
  'event_id.name', 'event_id.slug', 'event_id.status'
];

const NEWS_DETAIL_FIELDS = [
  ...NEWS_LIST_FIELDS,
  'content',
  'url_youtube',
  'website_url',
  'event_id.banner_image.id',
  'author_id.organisation_name'
];

const mapNews = (n: any): MappedNews => {
  return {
    ...n,
    thumbnail_url:    getAssetUrl(n.thumbnail),
    thumbnail_width:  n.thumbnail?.width  ?? null,
    thumbnail_height: n.thumbnail?.height ?? null,
    category:         n.category          ?? null,
    event_id: typeof n.event_id === 'object' && n.event_id !== null
      ? { ...n.event_id, banner_url: getAssetUrl(n.event_id.banner_image) }
      : null,
  };
};

// --- Exported data functions --------------------------------------------------

export const getMatches = async (): Promise<MappedMatch[]> => {
  try {
    const res = await fetchDirectus<any[]>(readItems<any, any, any>('matches', {
      fields: MATCH_FIELDS,
      filter: { status: { _in: ['live', 'upcoming', 'finished'] } },
      sort:   ['status', 'scheduled_at'],
    }), { 
      tags: ['matches', 'collection:matches'],
      revalidate: 10 // Short revalidate for match lists
    });
    return res.map(mapMatch);
  } catch (err) {
    console.error('[getMatches]', err);
    return [];
  }
};

export const getMatchesByEvent = async (slug: string): Promise<MappedMatch[]> => {
  const res = await fetchDirectus<any[]>(readItems<any, any, any>('matches', {
    filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } },
    fields: MATCH_FIELDS,
    sort:   ['status', 'scheduled_at'],
    limit:  -1,
  }), { tags: [`event:${slug}:matches`, `event:${slug}`] });
  return res.map(mapMatch);
};

export const getEventsForListing = async () => {
  try {
    return await fetchDirectus<any[]>(readItems<any, any, any>('events', {
      filter: { is_published: { _eq: true } },
      fields: ['id', 'name', 'slug', 'status', 'type', 'location', 'description', 'start_date', 'end_date', 'is_published', 'is_registration_open', 'registration_end_date', 'card_image.id', 'user_created.organisation_name'],
      sort:   ['start_date'],
      limit:  -1,
    }), { tags: ['events', 'collection:events'] });
  } catch (err) {
    console.error("[getEventsForListing]", err);
    return [];
  }
};

export const getEventDetail = async (slug: string): Promise<MappedEvent | null> => {
  try {
    const eventTags = [`event:${slug}`];
    
    const [events, phases, rawMatches, rawNews, participants] = await Promise.all([
      // Event basic info
      fetchDirectus<any[]>(readItems<any, any, any>('events', {
        filter: { slug: { _eq: slug } },
        fields: [
          'id', 'name', 'slug', 'status', 'type', 'location', 'description', 
          'start_date', 'end_date', 'registration_url', 'is_registration_open', 'registration_end_date',
          'guidebook_url', 'instagram_url', 'website_url', 'url_youtube', 
          'contact_person', 'banner_image.id', 'card_image.id', 'user_created.organisation_name'
        ],
        limit:  1,
      }), { tags: eventTags }),
      
      // Phases
      fetchDirectus<any[]>(readItems<any, any, any>('event_phases', {
        filter: { event_id: { slug: { _eq: slug } } },
        fields: ['id', 'label', 'status', 'date_start', 'date_end', 'time_start', 'description', 'display_order'],
        sort:   ['display_order'],
      }), { tags: [...eventTags, `event:${slug}:phases`] }),
      
      // Matches
      fetchDirectus<any[]>(readItems<any, any, any>('matches', {
        filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } },
        fields: MATCH_FIELDS,
        sort:   ['status', 'scheduled_at'],
        limit:  -1,
      }), { 
        tags: [...eventTags, `event:${slug}:matches`],
        revalidate: 10 // Short revalidate for match lists, client updates via SSE
      }),
      
      // News teaser
      fetchDirectus<any[]>(readItems<any, any, any>('news', {
        filter: {
          event_id:     { slug: { _eq: slug } },
          is_published: { _eq: true },
        },
        fields: NEWS_LIST_FIELDS,
        sort:   ['-published_at'],
        limit:  4,
      }), { tags: [...eventTags, `event:${slug}:news`] }),
      
      // Participants
      getParticipantsByEvent(slug),
    ]);

    const event = events[0];
    if (!event) return null;

    return {
      ...event,
      status:     STATUS_MAP[event.status] ?? 'concluded',
      banner_url: getAssetUrl(event.banner_image),
      organiser:  event.user_created?.organisation_name ?? '',
      phases:     phases as DirectusPhase[],
      matches:    rawMatches.map(mapMatch),
      news:       rawNews.map(mapNews),
      participants,
    } as MappedEvent;
  } catch (err) {
    console.error("[getEventDetail]", err);
    return null;
  }
};

// --- News ---------------------------------------------------------------------

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
    const countResult = await fetchDirectus<any[]>(aggregate<any, any, any>('news', {
      aggregate: { count: '*' },
      query:     { filter },
    }), { tags: [`event:${eventSlug}:news`, 'collection:news'] });
    const total      = Number(countResult?.[0]?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize);
    const offset     = (page - 1) * pageSize;
    return {
      pageCount:  Math.min(pageSize, Math.max(0, total - offset)),
      total,
      totalPages,
    };
  } catch (err) {
    console.error("[getNewsCountByEvent]", err);
    return { pageCount: pageSize, total: 0, totalPages: 0, error: true };
  }
};

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
    const items = await fetchDirectus<any[]>(readItems<any, any, any>('news', {
      filter,
      fields: NEWS_LIST_FIELDS,
      sort:   ['-published_at'],
      limit:  pageSize,
      offset: (page - 1) * pageSize,
    }), { tags: [`event:${eventSlug}:news`, 'collection:news'] });
    return { items: items.map(mapNews) };
  } catch (err) {
    console.error("[getNewsByEvent]", err);
    return { items: [], error: true };
  }
};

export const getNewsBySlug = async (
  eventSlug: string,
  newsSlug: string,
): Promise<MappedNews | null> => {
  try {
    const items = await fetchDirectus<any[]>(readItems<any, any, any>('news', {
      filter: {
        slug:         { _eq: newsSlug },
        event_id:     { slug: { _eq: eventSlug } },
        is_published: { _eq: true },
      },
      fields: NEWS_DETAIL_FIELDS,
      limit: 1,
    }), { tags: [`news:${newsSlug}`, `event:${eventSlug}:news`] });
    const item = items[0];
    return item ? mapNews(item) : null;
  } catch (err) {
    console.error("[getNewsBySlug]", err);
    return null;
  }
};

// --- Participants -------------------------------------------------------------

const PARTICIPANT_FIELDS = [
  'id', 'name', 'members', 'seed',
  'institution_id.id', 'institution_id.name', 'institution_id.logo',
  'competition_category_id.id',
  'competition_category_id.name',
  'competition_category_id.display_order',
];

export const getParticipantsByEvent = async (
  eventSlug: string,
): Promise<CategoryWithParticipants[]> => {
  try {
    const [categories, rawParticipants] = await Promise.all([
      fetchDirectus<any[]>(readItems<any, any, any>('competition_categories', {
        filter: { event_id: { slug: { _eq: eventSlug } } },
        fields: ['id', 'name', 'participant_type', 'display_order'],
        sort:   ['display_order', 'name'],
        limit:  -1,
      }), { tags: [`event:${eventSlug}:categories`, `event:${eventSlug}`] }),
      fetchDirectus<any[]>(readItems<any, any, any>('participants', {
        filter: { competition_category_id: { event_id: { slug: { _eq: eventSlug } } } },
        fields: PARTICIPANT_FIELDS,
        sort:   ['name'],
        limit:  -1,
      }), { tags: [`event:${eventSlug}:participants`, `event:${eventSlug}`] }),
    ]);

    const participants = rawParticipants.map(mapParticipant).filter(Boolean) as MappedParticipant[];

    return categories.map(cat => ({
      category:     cat,
      participants: participants.filter(p => {
        const catId = typeof p.competition_category_id === 'object'
          ? (p.competition_category_id as any)?.id
          : p.competition_category_id;
        return catId === cat.id;
      }),
    }));
  } catch (err) {
    console.error("[getParticipantsByEvent]", err);
    return [];
  }
};

// --- Schedule -----------------------------------------------------------------

export interface ScheduleMatchFilter {
  dateFrom: string | null;
  dateTo:   string | null;
  category: string | null;
  search:   string | null;
}

const SCHEDULE_FIELDS = MATCH_FIELDS;

export const getMatchesSchedule = async (
  filter: ScheduleMatchFilter = { dateFrom: null, dateTo: null, category: null, search: null },
): Promise<{ items: MappedMatch[] }> => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 30);
  const defaultTo = new Date(now);
  defaultTo.setDate(now.getDate() + 90);

  const dateFrom = filter.dateFrom ?? defaultFrom.toISOString();
  const dateTo   = filter.dateTo   ?? defaultTo.toISOString();

  const conditions: any[] = [
    { scheduled_at: { _gte: dateFrom } },
    { scheduled_at: { _lte: dateTo   } },
  ];

  if (filter.category) {
    conditions.push({
      competition_category_id: { name: { _icontains: filter.category } },
    });
  }

  if (filter.search) {
    conditions.push({
      _or: [
        { competition_category_id: { event_id: { name: { _icontains: filter.search } } } },
        { competition_category_id: { name:              { _icontains: filter.search } } },
        { home_participant_id:     { name:              { _icontains: filter.search } } },
        { away_participant_id:     { name:              { _icontains: filter.search } } },
        { venue:                   {                      _icontains: filter.search   } },
      ],
    });
  }

  try {
    const res = await fetchDirectus<any[]>(readItems<any, any, any>('matches', {
      filter: { _and: conditions },
      fields: SCHEDULE_FIELDS,
      sort:   ['scheduled_at'],
      limit:  -1,
    }), { 
      tags: ['matches', 'collection:matches'],
      revalidate: 60 
    });
    return { items: res.map(mapMatch) };
  } catch (err) {
    console.error('[getMatchesSchedule]', err);
    return { items: [] };
  }
};

// --- Misc ---------------------------------------------------------------------

export const getEvents = async () => getEventsForListing();

export const getStats = async () => {
  try {
    const [e, i, p] = await Promise.all([
      fetchDirectus<any[]>(aggregate<any, any, any>('events', { aggregate: { count: '*' } }), { tags: ['events', 'global:stats'] }),
      fetchDirectus<any[]>(aggregate<any, any, any>('institutions', { aggregate: { count: '*' } }), { tags: ['institutions', 'global:stats'] }),
      fetchDirectus<any[]>(aggregate<any, any, any>('participants', { aggregate: { count: '*' } }), { tags: ['participants', 'global:stats'] }),
    ]);
    return {
      eventsCount:      Number(e?.[0]?.count ?? 0),
      institutionsCount: Number(i?.[0]?.count ?? 0),
      participantsCount: Number(p?.[0]?.count ?? 0),
    };
  } catch (err) {
    console.error("[getStats]", err);
    return { eventsCount: 0, institutionsCount: 0, participantsCount: 0 };
  }
};

export const getNews = async ({ limit = 5 }: { limit?: number } = {}): Promise<MappedNews[]> => {
  const items = await fetchDirectus<any[]>(readItems<any, any, any>('news', {
    filter: { is_published: { _eq: true } },
    fields: NEWS_LIST_FIELDS,
    sort:   ['-published_at'],
    limit,
  }), { tags: ['news', 'collection:news'] });
  return items.map(mapNews);
};

export const getEventsWithRecentNews = async () => {
  try {
    const events = await fetchDirectus<any[]>(readItems<any, any, any>('events', {
      filter: { is_published: { _eq: true } },
      fields: ['id', 'name', 'slug', 'status', 'start_date', 'banner_image.id'],
      sort:   ['start_date'],
      limit:  -1,
    }), { tags: ['events', 'collection:events'] });

    const eventsWithNews = await Promise.all(
      events.map(async (event) => {
        const items = await fetchDirectus<any[]>(readItems<any, any, any>('news', {
          filter: {
            event_id:     { slug: { _eq: event.slug } },
            is_published: { _eq: true },
          },
          fields: NEWS_LIST_FIELDS,
          sort:   ['-published_at'],
          limit:  6,
        }), { tags: [`event:${event.slug}:news`, 'collection:news'] });
        return {
          id:           event.id,
          name:         event.name,
          slug:         event.slug,
          banner_image: event.banner_image ?? null,
          banner_url:   getAssetUrl(event.banner_image),
          status:       STATUS_MAP[event.status] ?? 'concluded',
          news:         items.map(mapNews),
        };
      })
    );

    return eventsWithNews.filter((e) => e.news.length > 0);
  } catch (err) {
    console.error('[getEventsWithRecentNews]', err);
    return [];
  }
};

export const getAllNewsFiltered = async ({
  page     = 1,
  pageSize = 24,
  filter   = {} as any,
  sort     = '-published_at',
}: {
  page?:     number;
  pageSize?: number;
  filter?:   any;
  sort?:     string;
} = {}): Promise<{ items: MappedNews[]; total: number; totalPages: number }> => {
  const FULL_FIELDS = NEWS_LIST_FIELDS;
  try {
    const [items, countResult] = await Promise.all([
      fetchDirectus<any[]>(readItems<any, any, any>('news', {
        filter,
        fields: FULL_FIELDS,
        sort:   [sort],
        limit:  pageSize,
        offset: (page - 1) * pageSize,
      }), { tags: ['news', 'collection:news'] }),
      fetchDirectus<any[]>(aggregate<any, any, any>('news', {
        aggregate: { count: '*' },
        query:     { filter },
      }), { tags: ['news', 'collection:news'] }),
    ]);
    const total = Number(countResult?.[0]?.count ?? 0);
    return {
      items:      items.map(mapNews),
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (err) {
    console.error("[getAllNewsFiltered]", err);
    return { items: [], total: 0, totalPages: 0 };
  }
};