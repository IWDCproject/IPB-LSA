import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Inisialisasi client Directus
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL)
  .with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));

export default directus;

// Fungsi untuk mendapatkan URL Gambar (mendukung Directus Asset ID maupun URL luar)
export const getAssetUrl = (asset) => {
  if (!asset) return null;
  // Jika sudah berupa URL lengkap (mulai dengan http/https), langsung kembalikan
  if (typeof asset === 'string' && (asset.startsWith('http://') || asset.startsWith('https://'))) {
    return asset;
  }
  // Jika berupa ID (dari Directus), buat URL lengkapnya
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:6767';
  return `${baseUrl}/assets/${asset}`;
};

// Fungsi untuk mengambil daftar Event
export const getEvents = async () => {
  try {
    return await directus.request(
      readItems('events', {
        filter: {
          is_published: { _eq: true }
        },
        fields: ['*'],
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
    return await directus.request(
      readItems('matches', {
        fields: [
          '*',
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
          'participants.id',
          'participants.position',
          'participants.participant_id.*',
          'participants.participant_id.institution.*',
        ],
        // Ambil yang statusnya live atau upcoming
        filter: {
          status: { _in: ['live', 'upcoming'] }
        },
        sort: ['status', 'scheduled_at'],
      })
    );
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