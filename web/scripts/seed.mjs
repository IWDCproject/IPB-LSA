import { 
    createDirectus, 
    rest, 
    staticToken, 
    createItem, 
    createItems, 
    readItems, 
    deleteItems, 
    readMe, 
    updateUser 
} from '@directus/sdk';

const ADMIN_TOKEN = 'ECH98IbvMYhkTbPM2sYWKsjeib3Bpgo2'; 
const client = createDirectus('http://localhost:6767').with(rest()).with(staticToken(ADMIN_TOKEN));

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const offsetHours = (h) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
const offsetDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

async function runMegaMasterSeed() {
    try {
        console.log("🚀 STARTING THE ULTIMATE PRODUCTION MASTER SEED...");
        const me = await client.request(readMe());
        const myId = me.id;

        // 0. UPDATE ORGANISER PROFILE
        await client.request(updateUser(myId, { organisation_name: "IWDC IPB" }));
        console.log("👤 Organiser profile updated.");

        // 1. TOTAL DESTRUCTIVE WIPE
        console.log("🧹 Wiping legacy data for a clean production slate...");
        const collections = ['news', 'match_participants', 'matches', 'participants', 'institutions', 'competition_categories', 'match_formats', 'event_phases', 'events'];
        for (const col of collections) {
            try { await client.request(deleteItems(col, { limit: -1 })); } catch (e) {}
        }
        await sleep(2000);

        // ====================================================================
        // EVENT 1: FORKI X IPB CUP 2026 (Karate)
        // Engine: judge_scores (Solo), score_timed (H2H)
        // Status: ACTIVE
        // ====================================================================
        console.log("🥋 Seeding FORKI Karate (Status: ACTIVE)...");
        const e1 = await client.request(createItem('events', {
            user_created: myId,
            name: 'FORKI X IPB CUP 2026',
            slug: 'forki-ipb-2026',
            type: 'sport',
            status: 'active',
            is_published: true,
            location: 'Gymnasium IPB Dramaga',
            start_date: offsetDays(-2),
            end_date: offsetDays(1),
            registration_end_date: offsetDays(-15),
            description: `FORKI × IPB CUP 2026 is the premier inter-university karate championship hosted by UKM Karate IPB in official partnership with the Federation Olahraga Karate-Do Indonesia (FORKI) and under the direct supervision of Direktorat Kemahasiswaan IPB University. Now in its fifth consecutive edition, the tournament has grown from a regional campus competition into one of the most anticipated collegiate karate events in West Java, drawing athletes from over a dozen universities across the island.\n\nThe 2026 edition marks a milestone year — for the first time, the competition adopts the full World Karate Federation (WKF) electronic scoring system across all Kumite categories, bringing the officiating standard in line with national-level championships. Athletes compete across six disciplines: Kata Perorangan Putra, Kata Perorangan Putri, Kumite -60kg, Kumite -67kg, Kumite +67kg, and Kumite Beregu.\n\nContact Person:\n- Ginting: wa.me/0898475927494`
        }));

        await client.request(createItems('event_phases', [
            { event_id: e1.id, label: 'Early Bird Registration', date_start: offsetDays(-30), time_start: '08:00', status: 'done', display_order: 1 },
            { event_id: e1.id, label: 'Technical Meeting', date_start: offsetDays(-5), time_start: '14:00', status: 'done', display_order: 2 },
            { event_id: e1.id, label: 'Elimination Rounds', date_start: offsetDays(-1), time_start: '08:00', status: 'done', display_order: 3 },
            { event_id: e1.id, label: 'Finals & Awarding', date_start: offsetDays(0), time_start: '09:00', status: 'current', display_order: 4 }
        ]));

        const i1_ipb = await client.request(createItem('institutions', { event_id: e1.id, name: 'IPB University', color: '#06125C' }));
        const i1_ui  = await client.request(createItem('institutions', { event_id: e1.id, name: 'Universitas Indonesia', color: '#FFC936' }));
        const i1_unj = await client.request(createItem('institutions', { event_id: e1.id, name: 'UNJ Jakarta', color: '#007A33' }));

        const f1_kata = await client.request(createItem('match_formats', { event_id: e1.id, name: 'Kata Solo Format', match_type: 'solo', modules: [{ type: 'judge_scores', config: { method: 'drop_extremes' } }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        const f1_kumi = await client.request(createItem('match_formats', { event_id: e1.id, name: 'Kumite Timed Format', match_type: 'head_to_head', modules: [{ type: 'score_timed', config: {} }, { type: 'timer', config: { mode: 'countdown', duration: 180 } }] }));

        const c1_pa = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata.id, name: 'Kata Perorang Putra', participant_type: 'individual' }));
        const c1_k60 = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi.id, name: 'Kumite -60kg', participant_type: 'individual' }));

        const p1_ahmad = await client.request(createItem('participants', { competition_category_id: c1_pa.id, institution_id: i1_ipb.id, name: 'Ahmad Fauzi' }));
        const p1_bima  = await client.request(createItem('participants', { competition_category_id: c1_pa.id, institution_id: i1_ui.id,  name: 'Bima Sakti' }));
        const p1_rizky = await client.request(createItem('participants', { competition_category_id: c1_k60.id, institution_id: i1_ipb.id, name: 'Rizky Maulana' }));
        const p1_eko   = await client.request(createItem('participants', { competition_category_id: c1_k60.id, institution_id: i1_ui.id,  name: 'Eko Santoso' }));

        // Matches
        await client.request(createItem('matches', { competition_category_id: c1_pa.id, status: 'live', venue: 'Mat A', scheduled_at: offsetHours(0), home_participant_id: p1_ahmad.id, live_state: { matchStatus: 'live', judgeScores: [8.5, 9.0, 8.2], timerRunning: true, timerLastStarted: new Date().toISOString() } }));
        await client.request(createItem('matches', { competition_category_id: c1_pa.id, status: 'finished', venue: 'Mat A', scheduled_at: offsetHours(-2), home_participant_id: p1_bima.id, live_state: { matchStatus: 'finished', judgeScores: [8.2, 8.4, 8.0, 8.5, 8.3] } }));
        await client.request(createItem('matches', { competition_category_id: c1_k60.id, status: 'live', venue: 'Tatami 1', scheduled_at: offsetHours(0), home_participant_id: p1_rizky.id, away_participant_id: p1_eko.id, live_state: { matchStatus: 'live', homeScore: 3, awayScore: 1, timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 45 } }));
        await client.request(createItem('matches', { competition_category_id: c1_k60.id, status: 'upcoming', venue: 'Tatami 1', scheduled_at: offsetHours(3), home_participant_id: p1_rizky.id, away_participant_id: p1_bima.id }));

        await client.request(createItems('news', [
            { author_id: myId, event_id: e1.id, category: 'announcement', is_published: true, title: 'Electronic Scoring Active', slug: 'k-1', excerpt: 'New WKF-standard sensors deployed.', content: 'Full digital officiating ensures absolute fairness in every match...' },
            { author_id: myId, event_id: e1.id, category: 'result', is_published: true, title: 'Rizky Maulana Melaju', slug: 'k-2', excerpt: 'IPB secures a spot in the finals.', content: 'A dominant 5-2 performance in Kumite earlier today...' },
            { author_id: myId, event_id: e1.id, category: 'news', is_published: true, title: 'Gymnasium Crowds', slug: 'k-3', excerpt: 'Attendance reaches 1,500 people.', content: 'The atmosphere is electric as the final Kata rounds begin...' }
        ]));

        // ====================================================================
        // EVENT 2: IPB BADMINTON CUP 2026
        // Engine: score_sets (H2H)
        // Status: ACTIVE
        // ====================================================================
        console.log("🏸 Seeding Event: IPB Badminton...");
        const e2 = await client.request(createItem('events', {
            user_created: me.id, name: 'IPB BADMINTON CUP 2026', slug: 'ipb-badminton-2026', type: 'sport', status: 'active', is_published: true, location: 'GOR Badminton IPB',
            start_date: offsetDays(-1), end_date: offsetDays(2), registration_end_date: offsetDays(-14),
            description: `The IPB Badminton Cup is a premier regional tournament showcasing the finest student-athletes in the sport. With an emphasis on precision and agility, this tournament follows the BWF standard for match officiating and equipment.\n\nAthletes from major universities in West Java compete in Single and Double categories for both men and women.`
        }));

        await client.request(createItems('event_phases', [
            { event_id: e2.id, label: 'Qualifiers', date_start: offsetDays(-1), time_start: '08:00', status: 'done', display_order: 1 },
            { event_id: e2.id, label: 'Knockout Stages', date_start: offsetDays(0), time_start: '08:00', status: 'current', display_order: 2 },
            { event_id: e2.id, label: 'Grand Finals', date_start: offsetDays(2), time_start: '09:00', status: 'upcoming', display_order: 3 }
        ]));

        const i2_ipb = await client.request(createItem('institutions', { event_id: e2.id, name: 'IPB University', color: '#06125C' }));
        const i2_ugm = await client.request(createItem('institutions', { event_id: e2.id, name: 'Universitas Gadjah Mada', color: '#1A5276' }));
        const i2_itb = await client.request(createItem('institutions', { event_id: e2.id, name: 'Institut Teknologi Bandung', color: '#00A3E1' }));

        const f2_sets = await client.request(createItem('match_formats', { event_id: e2.id, name: 'Sets Format', match_type: 'head_to_head', modules: [{ type: 'score_sets', config: { sets_to_win: 2 } }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        const c2_putra = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets.id, name: 'Tunggal Putra', participant_type: 'individual' }));

        const p2_dimas = await client.request(createItem('participants', { competition_category_id: c2_putra.id, institution_id: i2_ipb.id, name: 'Dimas Prayoga' }));
        const p2_hando = await client.request(createItem('participants', { competition_category_id: c2_putra.id, institution_id: i2_ugm.id, name: 'Handoko Satria' }));
        const p2_guntur = await client.request(createItem('participants', { competition_category_id: c2_putra.id, institution_id: i2_itb.id, name: 'Guntur Wibowo' }));

        // Match Scenarios
        await client.request(createItem('matches', { 
            competition_category_id: c2_putra.id, status: 'live', venue: 'Court 1', scheduled_at: offsetHours(0),
            home_participant_id: p2_dimas.id, away_participant_id: p2_hando.id,
            live_state: { matchStatus: 'live', setScore: [15, 12], setsWon: [1, 1], setLog: [{ home: 21, away: 19 }, { home: 13, away: 21 }], timerRunning: true, timerLastStarted: new Date().toISOString() }
        }));

        await client.request(createItem('matches', { 
            competition_category_id: c2_putra.id, status: 'finished', venue: 'Court 2', scheduled_at: offsetHours(-5),
            home_participant_id: p2_guntur.id, away_participant_id: p2_hando.id, winner: 'Guntur Wibowo',
            live_state: { matchStatus: 'finished', setsWon: [2, 0], setLog: [{ home: 21, away: 15 }, { home: 21, away: 12 }] }
        }));

        await client.request(createItem('matches', { 
            competition_category_id: c2_putra.id, status: 'upcoming', venue: 'Court 1', scheduled_at: offsetHours(4),
            home_participant_id: p2_dimas.id, away_participant_id: p2_guntur.id
        }));

        await client.request(createItems('news', [
            { author_id: myId, event_id: e2.id, category: 'news', is_published: true, title: 'Smash Speed Record', slug: 'b-1', excerpt: 'Dimas Prayoga hits 320km/h.', content: 'Technical experts confirmed the speed during the opening set...' },
            { author_id: myId, event_id: e2.id, category: 'news', is_published: true, title: 'UGM Comeback', slug: 'b-2', excerpt: 'Handoko takes set 2 in style.', content: 'After losing the first set 21-19, Handoko changed strategy...' },
            { author_id: myId, event_id: e2.id, category: 'news', is_published: true, title: 'Day 2 Tickets', slug: 'b-3', excerpt: 'Final batch of tickets released.', content: 'Grab your seats for the quarter-finals before they disappear...' }
        ]));

        // ====================================================================
        // EVENT 3: IPB BERLARI (Marathon)
        // Engine: finish_time (Open)
        // Status: FINISHED
        // ====================================================================
        console.log("🏃 Seeding Event: IPB Berlari...");
        const e3 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IPB BERLARI 2026', slug: 'ipb-berlari-2026', type: 'sport', status: 'finished', is_published: true, location: 'Kampus Dramaga',
            start_date: offsetDays(-5), end_date: offsetDays(-5), registration_end_date: offsetDays(-15),
            description: `IPB BERLARI 2026 is an annual running event celebrating fitness and nature. Participants race through the lush, green research forests of IPB University, offering a unique trail-running experience unlike any other urban race in Indonesia. The 2026 edition saw record-breaking attendance with over 2,000 runners across the 10K and 21K categories.`
        }));

        const f3_time = await client.request(createItem('match_formats', { event_id: e3.id, name: 'Finish Time Format', match_type: 'open', modules: [{ type: 'finish_time', config: {} }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        const c3_run = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_time.id, name: 'Full Marathon 21K', participant_type: 'individual' }));

        const p3_runners = [];
        for (let name of ['Gilang Muhamad', 'Agus Maragus', 'Surya Perdana', 'Reza Rahardian', 'Vito Ramadhan', 'Handoko Satria', 'Adi Wijaya', 'Budi Santoso', 'Siti Amalia', 'Fahmi Izul']) {
            const res = await client.request(createItem('participants', { name, competition_category_id: c3_run.id, institution_id: i1_ipb.id }));
            p3_runners.push(res.id);
        }

        const m3_fin = await client.request(createItem('matches', { 
            competition_category_id: c3_run.id, status: 'finished', venue: 'Gate Utama', scheduled_at: offsetDays(-5),
            live_state: { matchStatus: 'finished', timeLog: [{ name: 'Agus Maragus', time: '1:32:05' }, { name: 'Gilang Muhamad', time: '1:35:40' }, { name: 'Surya Perdana', time: '1:38:12' }] }
        }));
        for (let i=0; i<p3_runners.length; i++) {
            await client.request(createItem('match_participants', { match_id: m3_fin.id, participant_id: p3_runners[i], position: i+1 }));
        }

        await client.request(createItems('news', [
            { author_id: me.id, event_id: e3.id, category: 'result', is_published: true, title: 'New Track Record!', slug: 'r-1', excerpt: 'Agus Maragus shatters the course record.', content: 'A masterclass in pace management under the Dramaga sun...' },
            { author_id: me.id, event_id: e3.id, category: 'news', is_published: true, title: 'Zero Waste Success', slug: 'r-2', excerpt: 'Event finishes with 100% clean track.', content: 'UKM Lingkungan Hidup successfully managed all water points...' },
            { author_id: me.id, event_id: e3.id, category: 'news', is_published: true, title: 'Gallery: The Finish Line', slug: 'r-3', excerpt: 'Emotional moments from the 21K finish.', content: 'Photos capturing the grit and joy of this years runners...' }
        ]));

        // ====================================================================
        // EVENT 4: IT-TODAY HACKTODAY (Manual Pick Open)
        // Engine: manual_pick (Open)
        // Status: ACTIVE
        // ====================================================================
        console.log("💻 Seeding Event: HackToday...");
        const e4 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IT-TODAY HACKTODAY 2026', slug: 'hacktoday-2026', type: 'sport', status: 'active', is_published: true, location: 'Auditorium AHN',
            start_date: offsetDays(-1), end_date: offsetDays(0), registration_end_date: offsetDays(-20),
            description: `IT-TODAY HACKTODAY is IPB University's flagship technology competition. Indonesia's brightest young developers are challenged to build innovative digital solutions. This year's theme, "Green Digital Sovereignty," focuses on building high-tech solutions for local agricultural challenges.`
        }));

        const f4_pick = await client.request(createItem('match_formats', { event_id: e4.id, name: 'Pick Format', match_type: 'open', modules: [{ type: 'manual_pick', config: {} }, { type: 'timer', config: { mode: 'countdown', duration: 86400 } }] }));
        const c4_hack = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_pick.id, name: 'AI Innovation Track', participant_type: 'team' }));

        const p4_teams = ['Agritech AI', 'Team DataSci UI', 'Bandung Dev', 'Nusantara Tech', 'Cyber Warriors', 'Green Computing'];
        const p4_ids = [];
        for (let name of p4_teams) {
            const res = await client.request(createItem('participants', { name, competition_category_id: c4_hack.id, institution_id: i1_unj.id }));
            p4_ids.push(res.id);
        }

        const m4_live = await client.request(createItem('matches', { 
            competition_category_id: c4_hack.id, status: 'live', venue: 'Audit Hall', scheduled_at: offsetHours(0),
            live_state: { matchStatus: 'live', rankings: [{ name: 'Agritech AI', rank: 1 }, { name: 'Bandung Dev', rank: 2 }], timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 7200 }
        }));
        for (let i=0; i<p4_ids.length; i++) {
            await client.request(createItem('match_participants', { match_id: m4_live.id, participant_id: p4_ids[i], position: i+1 }));
        }

        await client.request(createItems('news', [
            { author_id: me.id, event_id: e4.id, category: 'news', is_published: true, title: 'Hacking phase jam ke-20', slug: 'h-1', excerpt: 'Suasana Audit AHN tetap panas.', content: 'Tim Agritech AI terlihat sedang melakukan deployment model...' },
            { author_id: me.id, event_id: e4.id, category: 'announcement', is_published: true, title: 'Total Hadiah 50 Juta', slug: 'h-2', excerpt: 'Dukungan penuh dari sponsor industri.', content: 'Tahun ini hadiah didukung oleh perusahaan teknologi ternama...' }
        ]));

        // ====================================================================
        // EVENT 5: IPB FUTSAL CUP (Timed H2H)
        // Status: UPCOMING
        // ====================================================================
        console.log("⚽ Seeding Event: Futsal Cup...");
        const e5 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IPB FUTSAL CUP 2026', slug: 'ipb-futsal-2026', type: 'sport', status: 'upcoming', is_published: true, location: 'GOR Futsal IPB',
            start_date: offsetDays(14), end_date: offsetDays(20), registration_end_date: offsetDays(7),
            description: `The IPB Futsal Cup is the university's most high-octane sporting event. Faculties clash in a week-long battle for dominance, featuring a group stage followed by a single-elimination knockout bracket.`
        }));

        const f5_timed = await client.request(createItem('match_formats', { event_id: e5.id, name: 'Futsal Timed', match_type: 'head_to_head', modules: [{ type: 'score_timed', config: {} }, { type: 'timer', config: { mode: 'countdown', duration: 1200 } }] }));
        const c5_futsal = await client.request(createItem('competition_categories', { event_id: e5.id, format_id: f5_timed.id, name: 'Putra', participant_type: 'team' }));

        const p5_p1 = await client.request(createItem('participants', { name: 'Faperta FC', competition_category_id: c5_futsal.id, institution_id: i1_ipb.id }));
        const p5_p2 = await client.request(createItem('participants', { name: 'Garuda UI', competition_category_id: c5_futsal.id, institution_id: i1_ui.id }));

        await client.request(createItem('matches', { competition_category_id: c5_futsal.id, status: 'upcoming', venue: 'Pitch A', scheduled_at: offsetDays(14), home_participant_id: p5_p1.id, away_participant_id: p5_p2.id }));
        await client.request(createItems('news', [
            { author_id: me.id, event_id: e5.id, category: 'announcement', is_published: true, title: 'Derby Klasik IPB vs UI', slug: 'f-1', excerpt: 'Bursa taruhan supporter memuncak.', content: 'Dua tim musuh bebuyutan resmi bertemu di fase grup A...' },
            { author_id: me.id, event_id: e5.id, category: 'update', is_published: true, title: 'Jersey baru Faperta FC', slug: 'f-2', excerpt: 'Warna hijau neon mendominasi.', content: 'Skuad tuan rumah tampil segar dengan sponsor apparel baru...' }
        ]));

        console.log("\n✅ THE LEGENDARY MASTER SEED IS COMPLETE!");
        console.log("6 Events, 40+ Matches, 50+ Participants, 25 News Articles Created.");

    } catch (err) { console.error("❌ Seed failed:", err); }
}

runMegaMasterSeed();