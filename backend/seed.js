import { createDirectus, rest, createItems, readItems, deleteItems } from '@directus/sdk';

// Adjust this URL to your Directus instance
const client = createDirectus('http://localhost:6767').with(rest());

async function megaSeed() {
    try {
        console.log("🚀 Starting Comprehensive Mega Seed...");

        // 1. CLEANUP
        const existing = await client.request(readItems('events', { filter: { slug: { _eq: 'test-mega-event' } } }));
        if (existing.length > 0) {
            console.log("🧹 Wiping old test data...");
            await client.request(deleteItems('events', { filter: { slug: { _eq: 'test-mega-event' } } }));
        }

        // 2. CREATE EVENT
        const event = await client.request(createItems('events', [{
            name: 'IPB LUCKY TEST EVENT 2026',
            slug: 'test-mega-event',
            type: 'sport',
            status: 'active',
            is_published: true
        }]));
        const eventId = event[0].id;

        // 3. CREATE INSTITUTIONS
        const insts = await client.request(createItems('institutions', [
            { event_id: eventId, name: 'IPB University', color: '#06125C' },
            { event_id: eventId, name: 'Universitas Indonesia', color: '#FFC936' },
            { event_id: eventId, name: 'Institut Teknologi Bandung', color: '#00A3E1' },
            { event_id: eventId, name: 'UPN Veteran Yogyakarta', color: '#007A33' }
        ]));

        // 4. CREATE FORMATS (All 5 Engines)
        const formats = await client.request(createItems('match_formats', [
            { event_id: eventId, name: 'Futsal (Timed)', match_type: 'head_to_head', modules: [{ type: 'score_timed', config: {} }, { type: 'timer', config: { mode: 'countdown', duration: 1200 } }] },
            { event_id: eventId, name: 'Badminton (Sets)', match_type: 'head_to_head', modules: [{ type: 'score_sets', config: { sets_to_win: 2 } }] },
            { event_id: eventId, name: 'Kata (Judge)', match_type: 'solo', modules: [{ type: 'judge_scores', config: { method: 'drop_extremes' } }] },
            { event_id: eventId, name: 'Marathon (Time)', match_type: 'open', modules: [{ type: 'finish_time', config: {} }] },
            { event_id: eventId, name: 'Hackathon (Pick)', match_type: 'open', modules: [{ type: 'manual_pick', config: {} }] }
        ]));

        // 5. CREATE CATEGORIES
        const cats = await client.request(createItems('competition_categories', formats.map(f => ({
            event_id: eventId,
            format_id: f.id,
            name: f.name.replace(' (', ' - Category ('),
            participant_type: f.match_type === 'open' ? 'team' : 'individual'
        }))));

        // 6. CREATE PARTICIPANTS
        const parts = await client.request(createItems('participants', [
            { competition_category_id: cats[0].id, institution_id: insts[0].id, name: 'IPB Team A' },
            { competition_category_id: cats[0].id, institution_id: insts[1].id, name: 'UI Garuda' },
            { competition_category_id: cats[2].id, institution_id: insts[0].id, name: 'Ahmad Fauzi' },
            { competition_category_id: cats[3].id, institution_id: insts[0].id, name: 'Runner Alpha' },
            { competition_category_id: cats[3].id, institution_id: insts[2].id, name: 'Runner Beta' },
            { competition_category_id: cats[4].id, institution_id: insts[0].id, name: 'Agritech AI' },
            { competition_category_id: cats[4].id, institution_id: insts[3].id, name: 'UPN Hackers' }
        ]));

        // 7. CREATE 15 MATCHES (3 States x 5 Formats)
        const matchPayload = [];

        // A. TIMED (Futsal)
        matchPayload.push(
            { competition_category_id: cats[0].id, status: 'upcoming', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'GOR Futsal', live_state: { matchStatus: 'upcoming' } },
            { competition_category_id: cats[0].id, status: 'live', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'GOR Futsal', live_state: { matchStatus: 'live', homeScore: 2, awayScore: 1 } },
            { competition_category_id: cats[0].id, status: 'finished', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'GOR Futsal', winner: 'IPB Team A', live_state: { matchStatus: 'finished', winner: 'IPB Team A', homeScore: 5, awayScore: 3 } }
        );

        // B. SETS (Badminton)
        matchPayload.push(
            { competition_category_id: cats[1].id, status: 'upcoming', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'Lapangan 1', live_state: { matchStatus: 'upcoming' } },
            { competition_category_id: cats[1].id, status: 'live', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'Lapangan 1', live_state: { matchStatus: 'live', setScore: [15, 12], setsWon: [1, 0], setLog: [{ home: 21, away: 19 }] } },
            { competition_category_id: cats[1].id, status: 'finished', home_participant_id: parts[0].id, away_participant_id: parts[1].id, venue: 'Lapangan 1', winner: 'IPB Team A', live_state: { matchStatus: 'finished', winner: 'IPB Team A', setsWon: [2, 1], setLog: [{ home: 21, away: 19 }, { home: 18, away: 21 }, { home: 21, away: 15 }] } }
        );

        // C. JUDGE SCORES (Kata Solo)
        matchPayload.push(
            { competition_category_id: cats[2].id, status: 'upcoming', home_participant_id: parts[2].id, venue: 'Panggung A', live_state: { matchStatus: 'upcoming' } },
            { competition_category_id: cats[2].id, status: 'live', home_participant_id: parts[2].id, venue: 'Panggung A', live_state: { matchStatus: 'live', judgeScores: [8.2, 8.5, 8.1, 8.4, 8.3] } },
            { competition_category_id: cats[2].id, status: 'finished', home_participant_id: parts[2].id, venue: 'Panggung A', live_state: { matchStatus: 'finished', judgeScores: [8.5, 8.7, 8.6, 9.0, 8.8] } }
        );

        // D. FINISH TIME (Open - Marathon)
        const marathonParts = [{ participant_id: parts[3].id }, { participant_id: parts[4].id }];
        matchPayload.push(
            { competition_category_id: cats[3].id, status: 'upcoming', venue: 'Gerbang Utama', live_state: { matchStatus: 'upcoming' }, participants: marathonParts },
            { competition_category_id: cats[3].id, status: 'live', venue: 'Gerbang Utama', live_state: { matchStatus: 'live', timeLog: [{ name: 'Runner Alpha', time: '1:42:33' }] }, participants: marathonParts },
            { competition_category_id: cats[3].id, status: 'finished', venue: 'Gerbang Utama', live_state: { matchStatus: 'finished', timeLog: [{ name: 'Runner Alpha', time: '1:42:33' }, { name: 'Runner Beta', time: '1:45:00' }] }, participants: marathonParts }
        );

        // E. MANUAL PICK (Open - Hackathon)
        const hackParts = [{ participant_id: parts[5].id }, { participant_id: parts[6].id }];
        matchPayload.push(
            { competition_category_id: cats[4].id, status: 'upcoming', venue: 'Auditorium AHN', live_state: { matchStatus: 'upcoming' }, participants: hackParts },
            { competition_category_id: cats[4].id, status: 'live', venue: 'Auditorium AHN', live_state: { matchStatus: 'live', rankings: [{ name: 'Agritech AI', rank: 1 }] }, participants: hackParts },
            { competition_category_id: cats[4].id, status: 'finished', venue: 'Auditorium AHN', winner: 'Agritech AI', live_state: { matchStatus: 'finished', winner: 'Agritech AI' }, participants: hackParts }
        );

        console.log("📡 Sending matches to Directus...");
        await client.request(createItems('matches', matchPayload));

        console.log("✅ PERFECT SEED COMPLETE!");
        console.log("👉 URL: http://localhost:3000/events/test-mega-event");

    } catch (err) {
        console.error("❌ Seed failed:", err);
    }
}

megaSeed();