import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Inisialisasi client Directus
const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL).with(rest());

export default directus;



export const getEvents = async () => {
  try {
    const events = await directus.request(
      readItems('events', {
        filter: {
          is_published: { _eq: true }
        },
        fields: ['*'], // Ambil semua field yang ada
        sort: ['start_date'],
      })
    );
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};