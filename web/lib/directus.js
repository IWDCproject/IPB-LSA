// @ts-check
import { createDirectus, rest, readItems, aggregate } from '@directus/sdk';

// ─── Directus clients ─────────────────────────────────────────────────────────

// Live data (scores, match state) — always fresh
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

// Stable data (news, participants, events) — revalidate every 60 s so the
// Next.js fetch cache works and pages don't refetch on every navigation.
// Set to 0 during local dev if you want no-store behaviour.
const directusCached = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, next: { revalidate: 60 } }) }));

export default directus;

export const getAssetUrl = (asset) => {
  if (!asset) return null;
  const id = typeof asset === 'object' ? asset.id : asset;
  if (!id || id === 'null') return null;
  if (typeof id === 'string' && id.startsWith('http')) return id;
  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  return `${base}/assets/${id}${typeof asset === 'object' && asset.uploaded_on ? `?v=${new Date(asset.uploaded_on).getTime()}` : ''}`;
};

const mapParticipant = (p) => {
  if (!p || typeof p !== 'object') return null;

  let parsedMembers = p.members;
  if (typeof p.members === 'string') {
    try {
      parsedMembers = JSON.parse(p.members);
    } catch (e) {
      // leave as-is if JSON.parse fails
    }
  }

  return {
    ...p,
    members: parsedMembers,
    institution: p.institution_id ? {
      ...p.institution_id,
      logo_url: getAssetUrl(p.institution_id?.logo),
    } : null,
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

const mapMatch = (m) => {
  const cat = m.competition_category_id;
  const fmt = cat?.format_id;
  const modules = typeof fmt?.modules === 'string' ? JSON.parse(fmt.modules) : (fmt?.modules ?? []);

  const junctionParts = (m.participants ?? []).map(j => ({
    ...j,
    participant_id: mapParticipant(j.participant_id)
  }));

  const home = mapParticipant(m.home_participant_id) || (junctionParts[0]?.participant_id ?? null);
  const away = mapParticipant(m.away_participant_id) || (junctionParts[1]?.participant_id ?? null);

  const live = m.live_state ?? {};
  if (live.timeLog && Array.isArray(live.timeLog)) {
    live.timeLog = live.timeLog.map(logEntry => {
      const pid = logEntry.participant_id?.id || logEntry.participant_id || logEntry.id;
      const found = junctionParts.find(jp => jp.participant_id?.id === pid);
      return {
        ...logEntry,
        institution: found?.participant_id?.institution || logEntry.institution || null
      };
    });
  }

  return {
    ...m,
    competition_category: { ...cat, format_id: { ...fmt, modules } },
    home_participant: home,
    away_participant: away,
    participants: junctionParts,
    live_state: live,
  };
};

const NEWS_FIELDS = ['*', 'thumbnail.*', 'event_id.name'];

const mapNews = (n) => ({
  ...n,
  thumbnail_url: getAssetUrl(n.thumbnail),
});

export const getMatches = async () => {
  try {
    const res = await directus.request(readItems('matches', {
      fields: MATCH_FIELDS,
      filter: { status: { _in: ['live', 'upcoming', 'finished'] } },
      sort: ['status', 'scheduled_at']
    }));
    return res.map(mapMatch);
  } catch (e) { return []; }
};

export const getEventsForListing = async () => {
  try {
    return await directusCached.request(readItems('events', {
      filter: { is_published: { _eq: true } },
      fields: ['*', 'user_created.organisation_name', 'card_image.*', 'banner_image.*'],
      sort: ['start_date'],
      limit: -1,
    }));
  } catch (e) { return []; }
};

export const getEventDetail = async (slug) => {
  try {
    const [events, phases, rawMatches, rawNews] = await Promise.all([
      directus.request(readItems("events", {
        filter: { slug: { _eq: slug } },
        fields: ["*", "banner_image.*", "card_image.*", "user_created.organisation_name"],
        limit: 1,
      })),
      directus.request(readItems("event_phases", {
        filter: { event_id: { slug: { _eq: slug } } },
        sort: ["display_order"],
      })),
      directus.request(readItems("matches", {
        filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } },
        fields: MATCH_FIELDS,
        sort: ["status", "scheduled_at"],
        limit: 50,
      })),
      // Overview teaser: 4 items, published only, with event name for badge
      directus.request(readItems("news", {
        filter: {
          event_id: { slug: { _eq: slug } },
          is_published: { _eq: true },
        },
        fields: NEWS_FIELDS,
        sort: ["-published_at"],
        limit: 4,
      })),
    ]);

    if (!events[0]) return null;

    return {
      ...events[0],
      banner_url: getAssetUrl(events[0].banner_image),
      organiser: events[0].user_created?.organisation_name ?? "",
      phases,
      matches: rawMatches.map(mapMatch),
      news: rawNews.map(mapNews),
    };
  } catch (e) { return null; }
};

// Cheap aggregate-only fetch for the News tab skeleton.
// Returns the number of items on the requested page so the skeleton can render
// the exact right number of cards before the full items response arrives.
// Fire this in parallel with getNewsByEvent — the aggregate resolves first,
// letting the skeleton correct its card count before the baton handoff happens.
export const getNewsCountByEvent = async (eventSlug, page = 1, pageSize = 6) => {
  const filter = {
    event_id: { slug: { _eq: eventSlug } },
    is_published: { _eq: true },
  };

  try {
    const countResult = await directusCached.request(aggregate('news', {
      aggregate: { count: '*' },
      query: { filter },
    }));

    const total      = Number(countResult?.[0]?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize);
    const offset     = (page - 1) * pageSize;

    return {
      pageCount: Math.min(pageSize, Math.max(0, total - offset)), // cards on this page
      total,
      totalPages,
    };
  } catch (e) {
    return { pageCount: pageSize, total: 0, totalPages: 0 };
  }
};

// Paginated news fetch for the News tab (items only — no aggregate).
// Pair with getNewsCountByEvent which fires in parallel and handles pagination
// metadata, so this function stays lean and avoids a redundant count query.
export const getNewsByEvent = async (eventSlug, page = 1, pageSize = 6) => {
  const filter = {
    event_id: { slug: { _eq: eventSlug } },
    is_published: { _eq: true },
  };

  try {
    const items = await directusCached.request(readItems('news', {
      filter,
      fields: NEWS_FIELDS,
      sort: ['-published_at'],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }));

    return { items: items.map(mapNews) };
  } catch (e) {
    return { items: [] };
  }
};

export const getEvents = async () => getEventsForListing();

export const getStats = async () => {
  try {
    const [e, i, p] = await Promise.all([
      directus.request(readItems('events')),
      directus.request(readItems('institutions')),
      directus.request(readItems('participants')),
    ]);
    return { eventsCount: e.length, institutionsCount: i.length, participantsCount: p.length };
  } catch (e) {
    return { eventsCount: 0, institutionsCount: 0, participantsCount: 0 };
  }
};

export const getNews = async ({ limit = 5 } = {}) => {
  const items = await directusCached.request(readItems('news', {
    filter: { is_published: { _eq: true } },
    fields: NEWS_FIELDS,
    sort: ['-published_at'],
    limit,
  }));
  return items.map(mapNews);
};

export const getYouTubeID = (url) => {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

const PARTICIPANT_FIELDS = [
  '*',
  'institution_id.*',
  'institution_id.logo.*',
  'competition_category_id.id',
  'competition_category_id.name',
  'competition_category_id.display_order',
];

export const getParticipantsByEvent = async (eventSlug) => {
  try {
    const [categories, rawParticipants] = await Promise.all([
      directusCached.request(readItems('competition_categories', {
        filter: { event_id: { slug: { _eq: eventSlug } } },
        fields: ['id', 'name', 'display_order'],
        sort: ['display_order', 'name'],
        limit: -1,
      })),
      directusCached.request(readItems('participants', {
        filter: {
          competition_category_id: {
            event_id: { slug: { _eq: eventSlug } },
          },
        },
        fields: PARTICIPANT_FIELDS,
        sort: ['name'],
        limit: -1,
      })),
    ]);

    const participants = rawParticipants.map(mapParticipant);

    return categories.map(cat => ({
      category: cat,
      participants: participants.filter(p => {
        const catId =
          typeof p.competition_category_id === 'object'
            ? p.competition_category_id?.id
            : p.competition_category_id;
        return catId === cat.id;
      }),
    }));
  } catch (e) {
    return [];
  }
};

// Maps raw Directus event status strings (including legacy aliases) to the
// three canonical values the frontend understands: "upcoming" | "ongoing" | "concluded".
// The inverse — canonical → raw — lives in _newsQueries.ts as STATUS_RAW_MAP.
export const STATUS_MAP = {
  upcoming:  'upcoming',
  ongoing:   'ongoing',
  active:    'ongoing',   // alias — remove if unused in Directus
  concluded: 'concluded',
  finished:  'concluded', // alias — remove if unused in Directus
  past:      'concluded', // alias — remove if unused in Directus
};

export const getEventsWithRecentNews = async () => {
  try {
    const events = await directusCached.request(readItems('events', {
      filter: { is_published: { _eq: true } },
      fields: ['id', 'name', 'slug', 'status', 'start_date', 'banner_image.*'],
      sort: ['start_date'],
      limit: -1,
    }));

    const eventsWithNews = await Promise.all(
      events.map(async (event) => {
        const items = await directusCached.request(readItems('news', {
          filter: {
            event_id:     { slug: { _eq: event.slug } },
            is_published: { _eq: true },
          },
          fields: NEWS_FIELDS,
          sort:  ['-published_at'],
          limit: 6,
        }));

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
  } catch (e) {
    return [];
  }
};

// Fetches paginated, filtered news for the "Semua Berita" tab.
// Build the filter argument with buildNewsFilter() from _newsQueries.ts
// rather than constructing the raw object in the calling component.
export const getAllNewsFiltered = async ({
  page     = 1,
  pageSize = 24,
  filter   = {},
  sort     = '-published_at',
} = {}) => {
  // Extend the base NEWS_FIELDS with event status + slug so the Semua Berita
  // tab can show status badges and the event filter works correctly.
  const FULL_FIELDS = ['*', 'thumbnail.*', 'event_id.name', 'event_id.slug', 'event_id.status'];

  try {
    const [items, countResult] = await Promise.all([
      directusCached.request(readItems('news', {
        filter,
        fields: FULL_FIELDS,
        sort: [sort],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })),
      directusCached.request(aggregate('news', {
        aggregate: { count: '*' },
        query: { filter },
      })),
    ]);

    const total = Number(countResult?.[0]?.count ?? 0);

    return {
      items:      items.map(mapNews),
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (e) {
    return { items: [], total: 0, totalPages: 0 };
  }
};