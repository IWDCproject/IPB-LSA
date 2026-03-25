import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Inisialisasi client Directus
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL).with(rest());

export default directus;

// Fungsi untuk mendapatkan URL Gambar (mendukung Directus Asset ID maupun URL luar)
export const getAssetUrl = (asset) => {
  if (!asset) return null;
  // Jika sudah berupa URL lengkap (mulai dengan http/https), langsung kembalikan
  if (typeof asset === 'string' && (asset.startsWith('http://') || asset.startsWith('https://'))) {
    return asset;
  }
  // Jika berupa ID (dari Directus), buat URL lengkapnya
  const baseUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
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
          'competition_category.*',
          'event.*',
          'home_participant.*',
          'home_participant.institution.*',
          'away_participant.*',
          'away_participant.institution.*',
          'participants.*',
          'participants.participant_id.*',
          'participants.participant_id.institution.*',
        ],
        // Ambil yang statusnya live atau upcoming
        filter: {
          status: { _in: ['live', 'upcoming'] }
        },
        sort: ['status', 'scheduled_at'], // Live biasanya di atas (berdasarkan abjad l < u)
      })
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};