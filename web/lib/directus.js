import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Inisialisasi client Directus
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

export default directus;

// Fungsi untuk mendapatkan URL Gambar (mendukung Directus Asset ID, file object, maupun URL luar)
export const getAssetUrl = (asset) => {
  if (!asset) return null;
  // Handle Directus file objects { id: '...', ... }
  const id = (asset !== null && typeof asset === 'object') ? asset.id : asset;
  if (!id) return null;
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
    // Fetch matches dan events secara paralel — hindari deep nested expansion
    // competition_category.event_id tidak reliable lewat nested query karena
    // permission public mungkin tidak cover competition_categories
    const [matches, events] = await Promise.all([
      directus.request(
        readItems('matches', {
          fields: [
            '*',
            'competition_category.id',
            'competition_category.name',
            'competition_category.participant_type',
            'competition_category.event_id',   // ambil UUID-nya saja
            'competition_category.format_id.*',
            'home_participant.*',
            'home_participant.institution.*',
            'away_participant.*',
            'away_participant.institution.*',
            'participants.id',
            'participants.position',
            'participants.participant_id.*',
            'participants.participant_id.institution.*',
          ],
          filter: { status: { _in: ['live', 'upcoming'] } },
          sort: ['status', 'scheduled_at'],
        })
      ),
      directus.request(
        readItems('events', {
          fields: ['*'],
          filter: { is_published: { _eq: true } },
        })
      ),
    ]);

    // Merge: inject event object ke dalam competition_category.event_id
    // menggunakan path yang sama yang bekerja di EventCard / HeroSection
    const eventsMap = new Map(events.map(e => [e.id, e]));

    return matches.map(m => {
      if (!m.competition_category) return m;
      const rawEventId = m.competition_category.event_id;
      const eventId = rawEventId && typeof rawEventId === 'object'
        ? rawEventId.id
        : rawEventId;
      return {
        ...m,
        competition_category: {
          ...m.competition_category,
          event_id: eventsMap.get(eventId) ?? m.competition_category.event_id,
        },
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
    // Karena Directus SDK rest() tidak memiliki helper count langsung yang simpel untuk multiple tables dalam satu request,
    // kita lakukan fetch minimal dengan limit 1 dan baca metadata total_count.
    // Namun cara paling pasti adalah menggunakan aggregate atau fetch biasa jika datanya belum ribuan.
    
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