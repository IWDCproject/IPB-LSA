import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Inisialisasi client Directus
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

export default directus;

// Fungsi untuk mendapatkan URL Gambar (mendukung Directus Asset ID, file object, maupun URL luar)
export const getAssetUrl = (asset) => {
  if (!asset) return null;
  const id = (asset !== null && typeof asset === 'object') ? asset.id : asset;
  if (!id) return null;
  if (typeof id === 'string' && id === 'null') return null; 
  if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://'))) return id;
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  return `${baseUrl}/assets/${id}`;
};


// Fungsi untuk mengambil daftar Event
export const getEvents = async () => {
  try {
    return await directus.request(
      readItems('events', {
        filter: { is_published: { _eq: true } },
        fields: ['*', 'user_created.organisation_name'],
        sort: ['start_date'],
      })
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

// Fungsi untuk mengambil daftar Pertandingan
export const getMatches = async () => {
  try {
    const matches = await directus.request(
      readItems('matches', {
        fields: [
          '*',
          'competition_category_id.id',
          'competition_category_id.name',
          'competition_category_id.participant_type',
          // FIX: request event subfields inline so they're always available,
          // instead of relying on a separate eventsMap lookup that breaks
          // when the events collection lacks public read permissions.
          'competition_category_id.event_id.id',
          'competition_category_id.event_id.name',
          'competition_category_id.event_id.slug',
          'competition_category_id.event_id.card_image',
          'competition_category_id.event_id.type',
          'competition_category_id.event_id.location',
          'competition_category_id.event_id.start_date',
          'competition_category_id.event_id.end_date',
          // Explicit subfields instead of .* — avoids JSONB string issue
          'competition_category_id.format_id.id',
          'competition_category_id.format_id.name',
          'competition_category_id.format_id.match_type',
          'competition_category_id.format_id.modules',
          'home_participant_id.*',
          'home_participant_id.institution_id.*',
          'away_participant_id.*',
          'away_participant_id.institution_id.*',
          'participants.id',
          'participants.position',
          'participants.participant_id.*',
          'participants.participant_id.institution_id.*',
        ],
        filter: { status: { _in: ['live', 'upcoming'] } },
        sort: ['status', 'scheduled_at'],
      })
    );

    return matches.map(m => {
    const cat = m.competition_category_id;
    if (!cat || typeof cat !== 'object') return m;

    // console.log('institution raw:', JSON.stringify(m.home_participant_id?.institution, null, 2));


    const rawFmt = cat.format_id;
    const format = rawFmt && typeof rawFmt === 'object' ? {
      ...rawFmt,
      modules: typeof rawFmt.modules === 'string' ? JSON.parse(rawFmt.modules) : (rawFmt.modules ?? []),
    } : null;
    
    const mapParticipant = (p) => p ? {
      ...p,
      institution: p.institution_id ? {
        ...p.institution_id,
        logo_url: getAssetUrl(p.institution_id?.logo),
      } : null,
    } : null;

    return {
      ...m,
      competition_category: { ...cat, format_id: format },
      home_participant: mapParticipant(m.home_participant_id),
      away_participant: mapParticipant(m.away_participant_id),
      participants: (m.participants ?? []).map(j => ({
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

// Fungsi untuk mengambil statistik (Count)
export const getStats = async () => {
  try {
    const [events, institutions, participants] = await Promise.all([
      directus.request(readItems('events', { fields: ['id'], limit: -1 })),
      directus.request(readItems('institutions', { fields: ['id'], limit: -1 })),
      directus.request(readItems('participants', { fields: ['id'], limit: -1 })),
    ]);

    return {
      eventsCount: events.length,
      institutionsCount: institutions.length,
      participantsCount: participants.length,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { eventsCount: 0, institutionsCount: 0, participantsCount: 0 };
  }
};

// Fungsi untuk mengambil berita terbaru dengan filter dan sorting
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
          'thumbnail',        
          'category',
          'published_at',
          'event_id.name',    
        ],
        sort:  ['-published_at'],
        limit,
      })
    );

    return items.map((item) => ({
      id:            item.id,
      title:         item.title,
      slug:          item.slug,
      excerpt:       item.excerpt ?? null,
      thumbnail_url: getAssetUrl(item.thumbnail),
      category:      item.category,
      published_at:  item.published_at,
      event_id:      item.event_id
                       ? { name: item.event_id.name }
                       : null,
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};