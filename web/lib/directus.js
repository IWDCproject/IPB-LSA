import { createDirectus, rest, readItems } from '@directus/sdk';

// ─── Client ────────────────────────────────────────────────────────────────
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

export default directus;


// ─── Asset URL ─────────────────────────────────────────────────────────────
//
// Supports three input shapes:
//   • null / undefined        → returns null
//   • string ID               → /assets/{id}         (no cache busting)
//   • { id, uploaded_on }     → /assets/{id}?v={ts}  (cache busting ON)
//
// The ?v= param comes from Directus's `uploaded_on` field, which updates
// specifically when the file binary is replaced — not on metadata edits.
// This makes the URL content-addressed: if the image changes, the URL
// changes, and the old blur cache entry becomes an orphan automatically.
// No manual purging, no env var bumping, no webhooks needed.
//
// To get cache busting, queries must request `field.id` and
// `field.uploaded_on` instead of just `field`. All queries below do this.
// If you add a new query elsewhere, follow the same pattern.
//
export const getAssetUrl = (asset) => {
  if (!asset) return null;
<<<<<<< HEAD
<<<<<<< HEAD
  // Jika sudah berupa URL lengkap (mulai dengan http/https), langsung kembalikan
  if (typeof asset === 'string' && (asset.startsWith('http://') || asset.startsWith('https://'))) {
    return asset;
  }
  // Jika berupa ID (dari Directus), buat URL lengkapnya
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  return `${baseUrl}/assets/${asset}`;
=======
  const id = (asset !== null && typeof asset === 'object') ? asset.id : asset;
  if (!id) return null;
  if (typeof id === 'string' && id === 'null') return null; 
  if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://'))) return id;
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  return `${baseUrl}/assets/${id}`;
>>>>>>> 39312ad2e9d2c24321a7a31f41d71ab1d01d9922
=======

  const isObj = typeof asset === 'object';
  const id    = isObj ? asset.id : asset;

  if (!id || id === 'null') return null;

  // Pass through external URLs unchanged
  if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://'))) {
    return id;
  }

  const base = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  const url  = `${base}/assets/${id}`;

  // Only append ?v= when we have the full object with uploaded_on.
  // Graceful degradation: string-only calls still work, just without busting.
  if (isObj && asset.uploaded_on) {
    const ts = new Date(asset.uploaded_on).getTime();
    return `${url}?v=${ts}`;
  }

  return url;
>>>>>>> 950ece0cde499955b56a9274a22a4e6e08b3fc98
};


// ─── Events ────────────────────────────────────────────────────────────────
//
// card_image is fetched as an object { id, uploaded_on, width, height } so that
// getAssetUrl can append the cache-busting ?v= parameter, and blurWorker
// can use natural dimensions without fetching the image just for sizing.
//
export const getEvents = async () => {
  try {
    return await directus.request(
      readItems('events', {
        filter: { is_published: { _eq: true } },
        fields: [
          '*',
          'user_created.organisation_name',
          // Fetch as object, not bare string ID — enables cache busting + natural dims
          'card_image.id',
          'card_image.uploaded_on',
          'card_image.width',
          'card_image.height',
        ],
        sort: ['start_date'],
      })
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};


// ─── Matches ───────────────────────────────────────────────────────────────
export const getMatches = async () => {
  try {
    const matches = await directus.request(
      readItems('matches', {
        fields: [
          '*',
<<<<<<< HEAD
          'competition_category.id',
          'competition_category.name',
          'competition_category.participant_type',
          'competition_category.event_id.id',
          'competition_category.event_id.name',
          'competition_category.event_id.card_image',
          'competition_category.format_id.*', // Ambil format dari kategori
          'home_participant.*',
          'home_participant.institution.*',
          'away_participant.*',
          'away_participant.institution.*',
=======
          'competition_category_id.id',
          'competition_category_id.name',
          'competition_category_id.participant_type',
          'competition_category_id.event_id.id',
          'competition_category_id.event_id.name',
          'competition_category_id.event_id.slug',
          // card_image as object for cache busting + natural dims
          'competition_category_id.event_id.card_image.id',
          'competition_category_id.event_id.card_image.uploaded_on',
          'competition_category_id.event_id.card_image.width',
          'competition_category_id.event_id.card_image.height',
          'competition_category_id.event_id.type',
          'competition_category_id.event_id.location',
          'competition_category_id.event_id.start_date',
          'competition_category_id.event_id.end_date',
          'competition_category_id.format_id.id',
          'competition_category_id.format_id.name',
          'competition_category_id.format_id.match_type',
          'competition_category_id.format_id.modules',
          'home_participant_id.*',
          'home_participant_id.institution_id.*',
          'away_participant_id.*',
          'away_participant_id.institution_id.*',
>>>>>>> 39312ad2e9d2c24321a7a31f41d71ab1d01d9922
          'participants.id',
          'participants.position',
          'participants.participant_id.*',
          'participants.participant_id.institution_id.*',
        ],
        filter: { status: { _in: ['live', 'upcoming'] } },
        sort: ['status', 'scheduled_at'],
      })
    );

    return matches.map((m) => {
      const cat = m.competition_category_id;
      if (!cat || typeof cat !== 'object') return m;

      const rawFmt = cat.format_id;
      const format = rawFmt && typeof rawFmt === 'object' ? {
        ...rawFmt,
        modules: typeof rawFmt.modules === 'string'
          ? JSON.parse(rawFmt.modules)
          : (rawFmt.modules ?? []),
      } : null;

      const mapParticipant = (p) => p ? {
        ...p,
        institution: p.institution_id ? {
          ...p.institution_id,
          // logo comes via institution_id.* as a string ID — logos rarely
          // change so cache busting isn't critical here, graceful degradation applies
          logo_url: getAssetUrl(p.institution_id?.logo),
        } : null,
      } : null;

      return {
        ...m,
        competition_category: { ...cat, format_id: format },
        home_participant:     mapParticipant(m.home_participant_id),
        away_participant:     mapParticipant(m.away_participant_id),
        participants:         (m.participants ?? []).map((j) => ({
          ...j,
          participant_id: mapParticipant(j.participant_id),
        })),
      };
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};


// ─── Stats ─────────────────────────────────────────────────────────────────
export const getStats = async () => {
  try {
    const [events, institutions, participants] = await Promise.all([
      directus.request(readItems('events',       { fields: ['id'], limit: -1 })),
      directus.request(readItems('institutions', { fields: ['id'], limit: -1 })),
      directus.request(readItems('participants', { fields: ['id'], limit: -1 })),
    ]);

    return {
      eventsCount:       events.length,
      institutionsCount: institutions.length,
      participantsCount: participants.length,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { eventsCount: 0, institutionsCount: 0, participantsCount: 0 };
  }
};


// ─── News ──────────────────────────────────────────────────────────────────
//
// thumbnail fetched as object for cache busting + natural dims, same pattern as card_image.
//
export const getNews = async ({ limit = 5 } = {}) => {
  try {
    const items = await directus.request(
      readItems('news', {
        filter: { is_published: { _eq: true } },
        fields: [
          'id',
          'title',
          'slug',
          'excerpt',
          // Fetch as object, not bare string ID — enables cache busting + natural dims
          'thumbnail.id',
          'thumbnail.uploaded_on',
          'thumbnail.width',
          'thumbnail.height',
          'category',
          'published_at',
          'event_id.name',
        ],
        sort:  ['-published_at'],
        limit,
      })
    );

    return items.map((item) => ({
      id:               item.id,
      title:            item.title,
      slug:             item.slug,
      excerpt:          item.excerpt ?? null,
      // item.thumbnail is now { id, uploaded_on, width, height }
      thumbnail_url:    getAssetUrl(item.thumbnail),
      thumbnail_width:  item.thumbnail?.width  ?? null,
      thumbnail_height: item.thumbnail?.height ?? null,
      category:         item.category,
      published_at:     item.published_at,
      event_id:         item.event_id ? { name: item.event_id.name } : null,
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};


// Events Page

export const getEventsForListing = async () => {
  try {
    return await directus.request(
      readItems('events', {
        filter: { is_published: { _eq: true } },
        fields: [
          '*',
          'user_created.organisation_name',
          'card_image.id',
          'card_image.uploaded_on',
          'card_image.width',
          'card_image.height',
          'banner_image.id',
          'banner_image.uploaded_on',
        ],
        sort: ['start_date'],
        limit: -1,
      })
    );
  } catch (error) {
    console.error('Error fetching events for listing:', error);
    return [];
  }
};