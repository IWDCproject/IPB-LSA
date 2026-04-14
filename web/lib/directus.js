import { createDirectus, rest, readItems } from '@directus/sdk';

const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

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
  return {
    ...p,
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
  
  // Map junction parts first
  const junctionParts = (m.participants ?? []).map(j => ({
    ...j,
    participant_id: mapParticipant(j.participant_id)
  }));

  // UNIVERSAL FALLBACK:
  // If top-level home_participant is empty (Open matches), use the first junction participant.
  const home = mapParticipant(m.home_participant_id) || (junctionParts[0]?.participant_id ?? null);
  const away = mapParticipant(m.away_participant_id) || (junctionParts[1]?.participant_id ?? null);

  return {
    ...m,
    competition_category: { ...cat, format_id: { ...fmt, modules } },
    home_participant: home,
    away_participant: away,
    participants: junctionParts,
  };
};

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
    return await directus.request(readItems('events', {
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
      directus.request(readItems("events", { filter: { slug: { _eq: slug } }, fields: ["*", "banner_image.*", "card_image.*", "user_created.organisation_name"], limit: 1 })),
      directus.request(readItems("event_phases", { filter: { event_id: { slug: { _eq: slug } } }, sort: ["display_order"] })),
      directus.request(readItems("matches", { filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } }, fields: MATCH_FIELDS, sort: ["status", "scheduled_at"], limit: 50 })),
      directus.request(readItems("news", { filter: { event_id: { slug: { _eq: slug } } }, fields: ["*", "thumbnail.*"], limit: 4 })),
    ]);
    if (!events[0]) return null;
    return {
      ...events[0],
      banner_url: getAssetUrl(events[0].banner_image),
      organiser: events[0].user_created?.organisation_name ?? "",
      phases,
      matches: rawMatches.map(mapMatch),
      news: rawNews.map(n => ({ ...n, thumbnail_url: getAssetUrl(n.thumbnail) })),
    };
  } catch (e) { return null; }
};

export const getEvents = async () => getEventsForListing();
export const getStats = async () => {
  const [e, i, p] = await Promise.all([directus.request(readItems('events')), directus.request(readItems('institutions')), directus.request(readItems('participants'))]);
  return { eventsCount: e.length, institutionsCount: i.length, participantsCount: p.length };
};
export const getNews = async ({ limit = 5 } = {}) => {
  const items = await directus.request(readItems('news', { 
    filter: { is_published: { _eq: true } }, 
    fields: ['*', 'thumbnail.*', 'event_id.name'], 
    sort: ['-published_at'], 
    limit 
  }));
  return items.map(i => ({ ...i, thumbnail_url: getAssetUrl(i.thumbnail) }));
};