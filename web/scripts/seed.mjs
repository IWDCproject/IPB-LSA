import { 
    createDirectus, 
    rest, 
    staticToken, 
    createItem, 
    createItems, 
    updateItem,
    deleteItems, 
    readMe, 
    updateUser 
} from '@directus/sdk';

// ==========================================
// CONFIGURATION
// ==========================================
const ADMIN_TOKEN = 'ECH98IbvMYhkTbPM2sYWKsjeib3Bpgo2'; 
const client = createDirectus('http://localhost:6767').with(rest()).with(staticToken(ADMIN_TOKEN));

// ==========================================
// UTILITIES & GENERATORS
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const offsetHours = (h) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
const offsetDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const firstNames =['Budi','Agus','Siti','Ayu','Reza','Gilang','Surya','Rina','Dian','Dwi','Tri','Eko','Hendra','Eka','Rizky','Dimas','Bayu','Aditya','Dinda','Putri','Irfan','Fahmi','Kevin','Marcus','Jonatan','Anthony'];
const lastNames =['Saputra','Wijaya','Santoso','Pratama','Sari','Lestari','Setiawan','Hidayat','Maulana','Rahardian','Wibowo','Kusuma','Haryanto','Nugroho','Siregar','Simanjuntak','Ginting'];
const generateName = () => `${randomPick(firstNames)} ${randomPick(lastNames)}`;

const universities =[
    { name: 'IPB University', color: '#06125C' },
    { name: 'Universitas Indonesia', color: '#FFC936' },
    { name: 'Institut Teknologi Bandung', color: '#00A3E1' },
    { name: 'Universitas Gadjah Mada', color: '#1A5276' },
    { name: 'Universitas Padjadjaran', color: '#E62129' },
    { name: 'Universitas Diponegoro', color: '#004A8A' },
    { name: 'Universitas Airlangga', color: '#FCD116' },
    { name: 'Institut Teknologi Sepuluh Nopember', color: '#0000FF' }
];

async function seedInstitutionsForEvent(eventId) {
    const ids =[];
    for (const univ of universities) {
        const res = await client.request(createItem('institutions', { 
            event_id: eventId, name: univ.name, color: univ.color 
        }));
        ids.push(res.id);
    }
    return ids; 
}

async function triggerDenorm(matchIds) {
    console.log(`   ⚙️ Triggering PGSQL denormalization for ${matchIds.length} matches...`);
    for (const id of matchIds) {
        await client.request(updateItem('matches', id, { updated_at: new Date().toISOString() }));
    }
}

// ==========================================
// MAIN SEED ENGINE
// ==========================================
async function runMegaMasterSeed() {
    try {
        console.log("🚀 STARTING THE ULTIMATE PRODUCTION MASTER SEED...\n");
        const me = await client.request(readMe());
        const myId = me.id;

        await client.request(updateUser(myId, { organisation_name: "IWDC IPB" }));
        console.log("👤 Organiser profile updated to IWDC IPB.");

        console.log("🧹 Wiping legacy data for a clean production slate...");
        const collections =['match_participants', 'matches', 'participants', 'competition_categories', 'match_formats', 'institutions', 'event_phases', 'news', 'events'];
        for (const col of collections) {
            try { await client.request(deleteItems(col, { limit: -1 })); } catch (e) {}
        }
        await sleep(2000);
        console.log("✅ Wipe complete.\n");

        const allMatchIdsToDenorm =[];

        // ====================================================================
        // EVENT 1: FORKI X IPB CUP 2026 (Karate)
        // Format Coverage: judge_scores (Solo), score_timed (H2H)
        // States: Finished, Live, Upcoming
        // ====================================================================
        console.log("🥋 [1/6] Seeding FORKI X IPB CUP 2026...");
        const e1 = await client.request(createItem('events', {
            user_created: myId, name: 'FORKI X IPB CUP 2026', slug: 'forki-ipb-2026', type: 'sport', status: 'active', is_published: true, location: 'Gymnasium IPB Dramaga', start_date: offsetDays(-2), end_date: offsetDays(1), registration_end_date: offsetDays(-15),
            description: `FORKI × IPB CUP 2026 is the premier inter-university karate championship hosted by UKM Karate IPB in official partnership with the Federation Olahraga Karate-Do Indonesia (FORKI). Now in its fifth consecutive edition, the tournament has grown from a regional campus competition into one of the most anticipated collegiate karate events in West Java.`
        }));

        await client.request(createItems('event_phases',[
            { event_id: e1.id, label: 'Technical Meeting', date_start: offsetDays(-5), time_start: '14:00', status: 'done', display_order: 1 },
            { event_id: e1.id, label: 'Elimination Rounds', date_start: offsetDays(-1), time_start: '08:00', status: 'done', display_order: 2 },
            { event_id: e1.id, label: 'Finals & Awarding', date_start: offsetDays(0), time_start: '09:00', status: 'current', display_order: 3 }
        ]));

        const i1_ids = await seedInstitutionsForEvent(e1.id);
        const f1_kata = await client.request(createItem('match_formats', { event_id: e1.id, name: 'Kata Solo Format', match_type: 'solo', modules:[{ type: 'judge_scores', config: { num_judges: 5, method: 'drop_extremes', score_min: 5, score_max: 10, step: 0.1 } }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        const f1_kumi = await client.request(createItem('match_formats', { event_id: e1.id, name: 'Kumite Timed Format', match_type: 'head_to_head', modules:[{ type: 'score_timed', config: { score_label: 'Poin', has_periods: false } }, { type: 'timer', config: { mode: 'countdown', duration: 180 } }] }));
        
        const c1_kata = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata.id, name: 'Kata Perorangan Putra', participant_type: 'individual' }));
        const c1_k60 = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi.id, name: 'Kumite -60kg', participant_type: 'individual' }));

        // KATA MATCHES (Solo, Judge Scores)
        const p1_kata_1 = await client.request(createItem('participants', { competition_category_id: c1_kata.id, institution_id: i1_ids[0], name: generateName() }));
        const p1_kata_2 = await client.request(createItem('participants', { competition_category_id: c1_kata.id, institution_id: i1_ids[1], name: generateName() }));
        const p1_kata_3 = await client.request(createItem('participants', { competition_category_id: c1_kata.id, institution_id: i1_ids[2], name: generateName() }));

        const m1_kata_f = await client.request(createItem('matches', { competition_category_id: c1_kata.id, status: 'finished', round: 'Round 1', venue: 'Tatami 1', home_participant_id: p1_kata_1.id, live_state: { matchStatus: 'finished', judgeScores:[8.5, 8.2, 8.8, 8.4, 8.5], timerRunning: false, timerSecs: 184 } }));
        const m1_kata_l = await client.request(createItem('matches', { competition_category_id: c1_kata.id, status: 'live', round: 'Round 1', venue: 'Tatami 1', home_participant_id: p1_kata_2.id, live_state: { matchStatus: 'live', judgeScores:[8.5, 8.4, null, null, null], timerRunning: true, timerSecs: 45, timerLastStarted: new Date().toISOString() } }));
        const m1_kata_u = await client.request(createItem('matches', { competition_category_id: c1_kata.id, status: 'upcoming', round: 'Round 1', venue: 'Tatami 1', scheduled_at: offsetHours(1), home_participant_id: p1_kata_3.id, live_state: { matchStatus: 'upcoming', judgeScores:[], timerRunning: false, timerSecs: 0 } }));
        allMatchIdsToDenorm.push(m1_kata_f.id, m1_kata_l.id);

        // KUMITE MATCHES (H2H, Score Timed)
        const p1_k60_ids =[];
        for(let i=0; i<4; i++) {
            const p = await client.request(createItem('participants', { competition_category_id: c1_k60.id, institution_id: randomPick(i1_ids), name: generateName(), seed: i+1 }));
            p1_k60_ids.push(p.id);
        }
        const m1_kumi_f = await client.request(createItem('matches', { competition_category_id: c1_k60.id, status: 'finished', round: 'Semi Final 1', venue: 'Tatami 2', home_participant_id: p1_k60_ids[0], away_participant_id: p1_k60_ids[1], live_state: { matchStatus: 'finished', homeScore: 5, awayScore: 2, winner: p1_k60_ids[0], timerRunning: false, timerSecs: 0 } }));
        const m1_kumi_l = await client.request(createItem('matches', { competition_category_id: c1_k60.id, status: 'live', round: 'Semi Final 2', venue: 'Tatami 2', home_participant_id: p1_k60_ids[2], away_participant_id: p1_k60_ids[3], live_state: { matchStatus: 'live', homeScore: 1, awayScore: 1, timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 120 } }));
        const m1_kumi_u = await client.request(createItem('matches', { competition_category_id: c1_k60.id, status: 'upcoming', round: 'Grand Final', venue: 'Main Tatami', scheduled_at: offsetHours(3), home_participant_id: p1_k60_ids[0], away_participant_id: p1_k60_ids[2] }));
        allMatchIdsToDenorm.push(m1_kumi_f.id, m1_kumi_l.id);

        await client.request(createItems('news',[
            { author_id: myId, event_id: e1.id, category: 'announcement', is_published: true, title: 'Sejarah Baru: Penjurian Elektronik WKF Aktif', slug: 'k-1', excerpt: 'FORKI X IPB Cup kini menggunakan sistem standar internasional WKF.', 
              content: 'Kompetisi tahun ini membawa angin segar bagi dunia bela diri mahasiswa. Untuk pertama kalinya dalam sejarah penyelenggaraan FORKI X IPB Cup, panitia resmi mengimplementasikan sistem penjurian elektronik (Electronic Scoring System) berstandar World Karate Federation (WKF).\n\nKetua panitia menjelaskan bahwa langkah ini diambil untuk memastikan transparansi dan keadilan mutlak di setiap pertandingan kumite. "Kami ingin atlet merasa dihargai dengan penilaian yang objektif. Sensor dan sistem tablet yang digunakan sama persis dengan yang dipakai di ajang PON maupun SEA Games," ujarnya.\n\nPara peserta menyambut antusias perubahan ini. Pertandingan di hari pertama berjalan jauh lebih lancar dengan minimnya protes dari kubu pelatih, membuktikan bahwa adaptasi teknologi adalah jalan ke depan untuk olahraga tatami antar perguruan tinggi di Indonesia.' },
            { author_id: myId, event_id: e1.id, category: 'result', is_published: true, title: 'Dominasi Tuan Rumah di Babak Penyisihan Kumite', slug: 'k-2', excerpt: 'IPB University berhasil mengirimkan wakilnya ke babak semifinal Kumite dengan kemenangan dramatis.', 
              content: 'Sorak-sorai penonton pecah di Gymnasium IPB saat atlet andalan tuan rumah mengeksekusi tendangan Ura Mawashi Geri yang sempurna tepat 10 detik sebelum waktu pertandingan berakhir.\n\nKemenangan dramatis dengan skor akhir 5-4 ini memastikan IPB mendominasi slot semifinal di kelas Kumite -60kg Putra. Sang pelatih menyebut bahwa pemusatan latihan selama 3 bulan terakhir di Puncak, Bogor, membuahkan hasil yang sangat signifikan, terutama pada ketahanan fisik para atlet di menit-menit kritis pertandingan.\n\nBabak semifinal akan dilanjutkan esok hari dan diprediksi akan menjadi pertarungan sengit melawan musuh bebuyutan dari perguruan tinggi asal Bandung. Pihak penyelenggara memperkirakan tiket penonton akan terjual habis sebelum pertandingan dimulai.' }
        ]));

        // ====================================================================
        // EVENT 2: IPB BADMINTON CUP 2026
        // Format Coverage: score_sets (H2H)
        // States: Finished, Live, Upcoming
        // ====================================================================
        console.log("🏸 [2/6] Seeding IPB BADMINTON CUP 2026...");
        const e2 = await client.request(createItem('events', {
            user_created: me.id, name: 'IPB BADMINTON CUP 2026', slug: 'ipb-badminton-2026', type: 'sport', status: 'active', is_published: true, location: 'GOR Badminton IPB', start_date: offsetDays(-1), end_date: offsetDays(2), registration_end_date: offsetDays(-14),
            description: `The IPB Badminton Cup is a premier regional tournament showcasing the finest student-athletes in the sport. Following the BWF standard for match officiating and equipment.`
        }));

        const i2_ids = await seedInstitutionsForEvent(e2.id);
        const f2_sets = await client.request(createItem('match_formats', { event_id: e2.id, name: 'BWF Sets Format', match_type: 'head_to_head', modules:[{ type: 'score_sets', config: { sets_to_win: 2, term: "Set", max_sets: 3 } }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        const c2_putra = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets.id, name: 'Tunggal Putra', participant_type: 'individual' }));

        const p2_p =[];
        for(let i=0; i<6; i++) {
            const res = await client.request(createItem('participants', { competition_category_id: c2_putra.id, institution_id: randomPick(i2_ids), name: generateName() }));
            p2_p.push(res.id);
        }

        const m2_f = await client.request(createItem('matches', { 
            competition_category_id: c2_putra.id, status: 'finished', venue: 'Court 2', home_participant_id: p2_p[0], away_participant_id: p2_p[1], round: 'Quarter Finals',
            live_state: { matchStatus: 'finished', setIdx: 1, setScore: [21, 15], setsWon:[2, 0], setLog:[{ home: 21, away: 12 }, { home: 21, away: 15 }], winner: p2_p[0], timerRunning: false, timerSecs: 2400 }
        }));
        const m2_l = await client.request(createItem('matches', { 
            competition_category_id: c2_putra.id, status: 'live', venue: 'Court 1', scheduled_at: offsetHours(0), home_participant_id: p2_p[2], away_participant_id: p2_p[3], round: 'Semi Finals',
            live_state: { matchStatus: 'live', setIdx: 2, setScore: [14, 18], setsWon:[1, 1], setLog:[{ home: 21, away: 19 }, { home: 13, away: 21 }], timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 3600 }
        }));
        const m2_u = await client.request(createItem('matches', { competition_category_id: c2_putra.id, status: 'upcoming', venue: 'Court 1', scheduled_at: offsetHours(5), home_participant_id: p2_p[4], away_participant_id: p2_p[5], round: 'Grand Final' }));
        allMatchIdsToDenorm.push(m2_f.id, m2_l.id);

        await client.request(createItems('news',[
            { author_id: myId, event_id: e2.id, category: 'news', is_published: true, title: 'Rekor Kecepatan Smash Terpecahkan di GOR IPB', slug: 'b-1', excerpt: 'Alat ukur BWF mencatat kecepatan smash luar biasa yakni 320km/jam.', 
              content: 'Suasana GOR Badminton IPB langsung riuh saat sebuah smash keras menghujam lurus ke sisi lapangan lawan tanpa bisa dikembalikan. Bukan hanya karena poin krusial yang didapat, melainkan karena layar pengukur kecepatan di pinggir lapangan menunjukkan angka yang tidak masuk akal untuk ukuran atlet mahasiswa: 320km/jam.\n\nTechnical Delegate dari PBSI yang hadir memantau pertandingan pun dibuat terkejut. "Ini adalah potensi yang luar biasa. Sangat jarang kita melihat power frame rate sehebat itu di kelas kompetisi universitas. Shuttlecock yang digunakan sampai rusak bulunya dalam satu pukulan," ungkap beliau.\n\nRekor ini kini dipegang resmi oleh sang atlet, menjadikannya standar baru yang akan sangat sulit dipatahkan oleh pemain lain di turnamen ini.' },
            { author_id: myId, event_id: e2.id, category: 'update', is_published: true, title: 'Kapasitas Tribun Hari Kedua Penuh Sesak', slug: 'b-2', excerpt: 'Tiket online ludes terjual dalam kurun waktu kurang dari 3 jam.', 
              content: 'Antusiasme mahasiswa terhadap IPB Badminton Cup tahun ini benar-benar di luar ekspektasi panitia penyelenggara. Seluruh tiket untuk pertandingan hari kedua yang mempertandingkan babak perempat final dan semifinal telah ludes terjual secara online hanya dalam hitungan jam.\n\nPanitia terpaksa menyediakan layar tancap (nobar) di pelataran luar GOR karena kapasitas 1.500 kursi di dalam venue sudah tak mampu lagi menampung animo suporter dari berbagai fakultas dan universitas tamu. Cuaca mendung khas Kota Hujan rupanya tak menyurutkan semangat ribuan penonton yang membawa drum, syal, dan spanduk dukungan bagi almamater mereka masing-masing.' }
        ]));

        // ====================================================================
        // EVENT 3: IPB BERLARI (Marathon)
        // Format Coverage: finish_time (Open)
        // States: Finished (21K), Live (10K), Upcoming (5K)
        // ====================================================================
        console.log("🏃[3/6] Seeding IPB BERLARI 2026...");
        const e3 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IPB BERLARI 2026', slug: 'ipb-berlari-2026', type: 'sport', status: 'active', is_published: true, location: 'Kampus Dramaga', start_date: offsetDays(-5), end_date: offsetDays(-5), registration_end_date: offsetDays(-15),
            description: `IPB BERLARI 2026 is an annual trail running event celebrating fitness and nature. Participants race through the lush, green research forests of IPB University.`
        }));

        const i3_ids = await seedInstitutionsForEvent(e3.id);
        const f3_time = await client.request(createItem('match_formats', { event_id: e3.id, name: 'Race Format', match_type: 'open', modules:[{ type: 'finish_time', config: { unit: 's', rank_order: 'asc' } }, { type: 'timer', config: { mode: 'stopwatch' } }] }));
        
        const c3_21k = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_time.id, name: '21K Half Marathon', participant_type: 'individual' }));
        const c3_10k = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_time.id, name: '10K Challenge', participant_type: 'individual' }));
        const c3_5k = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_time.id, name: '5K Fun Run', participant_type: 'individual' }));

        // 21K - FINISHED
        const p3_21k =[];
        for (let i = 0; i < 10; i++) {
            const res = await client.request(createItem('participants', { name: generateName(), competition_category_id: c3_21k.id, institution_id: randomPick(i3_ids) }));
            p3_21k.push({ id: res.id, name: res.name, time: 5400 + randomInt(0, 3600) });
        }
        p3_21k.sort((a, b) => a.time - b.time);
        const m3_21k_f = await client.request(createItem('matches', { 
            competition_category_id: c3_21k.id, status: 'finished', venue: 'Gate Utama', 
            live_state: { matchStatus: 'finished', timeLog: p3_21k.map(r => ({ id: r.id, name: r.name, time: `${Math.floor(r.time/3600)}:${Math.floor((r.time%3600)/60).toString().padStart(2,'0')}:${(r.time%60).toString().padStart(2,'0')}` })), rankings: p3_21k.map((r, i) => ({ id: r.id, name: r.name, rank: i + 1 })), timerSecs: p3_21k[p3_21k.length-1].time, timerRunning: false }
        }));
        await client.request(createItems('match_participants', p3_21k.map((r, i) => ({ match_id: m3_21k_f.id, participant_id: r.id, position: i + 1 }))));
        allMatchIdsToDenorm.push(m3_21k_f.id);

        // 10K - LIVE
        const p3_10k =[];
        for (let i = 0; i < 10; i++) {
            const res = await client.request(createItem('participants', { name: generateName(), competition_category_id: c3_10k.id, institution_id: randomPick(i3_ids) }));
            p3_10k.push({ id: res.id, name: res.name, time: 2400 + randomInt(0, 600) });
        }
        const p3_10k_finished = p3_10k.slice(0, 3).sort((a,b) => a.time - b.time);
        const m3_10k_l = await client.request(createItem('matches', { 
            competition_category_id: c3_10k.id, status: 'live', venue: 'Gate Utama', 
            live_state: { matchStatus: 'live', timeLog: p3_10k_finished.map(r => ({ id: r.id, name: r.name, time: `${Math.floor(r.time/3600)}:${Math.floor((r.time%3600)/60).toString().padStart(2,'0')}:${(r.time%60).toString().padStart(2,'0')}` })), rankings: p3_10k_finished.map((r, i) => ({ id: r.id, name: r.name, rank: i + 1 })), timerSecs: 3600, timerRunning: true, timerLastStarted: new Date().toISOString() }
        }));
        await client.request(createItems('match_participants', p3_10k.map((r, i) => ({ match_id: m3_10k_l.id, participant_id: r.id, position: i + 1 }))));
        allMatchIdsToDenorm.push(m3_10k_l.id);

        // 5K - UPCOMING
        const p3_5k =[];
        for (let i = 0; i < 5; i++) {
            const res = await client.request(createItem('participants', { name: generateName(), competition_category_id: c3_5k.id, institution_id: randomPick(i3_ids) }));
            p3_5k.push({ id: res.id, name: res.name });
        }
        const m3_5k_u = await client.request(createItem('matches', { competition_category_id: c3_5k.id, status: 'upcoming', venue: 'Gate Utama', scheduled_at: offsetHours(2), live_state: { matchStatus: 'upcoming', timeLog: [], rankings:[], timerSecs: 0, timerRunning: false } }));
        await client.request(createItems('match_participants', p3_5k.map((r, i) => ({ match_id: m3_5k_u.id, participant_id: r.id, position: i + 1 }))));

        await client.request(createItems('news',[
            { author_id: me.id, event_id: e3.id, category: 'result', is_published: true, title: 'Rekor Waktu 21K Trail Run Terpecahkan', slug: 'r-1', excerpt: `Trek perbukitan dan hutan penelitian IPB berhasil ditaklukkan dalam waktu super cepat.`, 
              content: `Edisi tahun ini dari IPB Berlari memberikan kejutan besar bagi komunitas lari jarak jauh. Seorang pelari muda berhasil memecahkan rekor lintasan 21K yang terkenal menantang dengan kombinasi jalan aspal dan tanah hutan berlumpur.\n\n"Trek di Sektor 4 dekat Hutan Konservasi sangat berat karena elevasi yang mendadak naik, namun udaranya sangat bersih dan sejuk sehingga membantu menjaga ritme pernapasan," kata sang pemenang usai menyentuh garis finis.\n\nKetua panitia memuji sportivitas seluruh peserta yang berhasil mencapai garis finis di bawah batas cut-off time (COT) 3,5 jam. Event ini semakin menegaskan posisi Kampus IPB sebagai venue sport-tourism hijau unggulan di Jawa Barat.` },
            { author_id: me.id, event_id: e3.id, category: 'news', is_published: true, title: 'Sukseskan Konsep Zero-Waste Event', slug: 'r-2', excerpt: 'Panitia pastikan tidak ada satupun sampah plastik tertinggal di area hutan kampus.', 
              content: `Sejalan dengan visi IPB sebagai Green Campus, IPB Berlari 2026 menerapkan aturan nol sampah (zero-waste) secara ketat. Bekerja sama dengan UKM Lingkungan Hidup, panitia mendirikan 10 titik water station yang mewajibkan peserta menggunakan water-bladder atau tumbler bawaan sendiri, tanpa menyediakan cup plastik sekali pakai.\n\nTim penyapu jalur (sweeper) yang bertugas di akhir rombongan melaporkan hasil yang membanggakan: lintasan sepanjang 21 kilometer benar-benar bersih pasca acara.\n\nLangkah berani penyelenggara ini menuai pujian dari Dinas Lingkungan Hidup Kota Bogor dan diharapkan menjadi standar wajib bagi seluruh penyelenggaraan ajang lari marathon berskala nasional di masa mendatang.` }
        ]));


        // ====================================================================
        // EVENT 4: IT-TODAY HACKTODAY (Manual Pick Open)
        // Format Coverage: manual_pick + timer
        // States: Finished (Web3), Live (AI), Upcoming (Cyber)
        // ====================================================================
        console.log("💻 [4/6] Seeding IT-TODAY HACKTODAY 2026...");
        const e4 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IT-TODAY HACKTODAY 2026', slug: 'hacktoday-2026', type: 'sport', status: 'active', is_published: true, location: 'Auditorium AHN', start_date: offsetDays(-1), end_date: offsetDays(0), registration_end_date: offsetDays(-20),
            description: `IT-TODAY HACKTODAY is IPB University's flagship technology competition. Indonesia's brightest young developers build high-tech solutions for local agricultural challenges.`
        }));

        const i4_ids = await seedInstitutionsForEvent(e4.id);
        const f4_pick = await client.request(createItem('match_formats', { event_id: e4.id, name: 'Pitch Deck Judgement', match_type: 'open', modules:[{ type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } }, { type: 'timer', config: { mode: 'countdown', duration: 86400 } }] }));
        
        const c4_web3 = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_pick.id, name: 'Web3 Development', participant_type: 'team' }));
        const c4_ai = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_pick.id, name: 'AI Innovation', participant_type: 'team' }));
        const c4_cyber = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_pick.id, name: 'Cybersecurity CTF', participant_type: 'team' }));

        const genHackTeams = async (catId) => {
            const teams =[];
            for(let i=0; i<6; i++) {
                const res = await client.request(createItem('participants', { name: `Team ${generateName().split(' ')[0]}`, competition_category_id: catId, institution_id: randomPick(i4_ids) }));
                teams.push({ id: res.id, name: res.name });
            }
            return teams;
        };

        // Web3 - FINISHED
        const p4_web3 = await genHackTeams(c4_web3.id);
        const m4_web3_f = await client.request(createItem('matches', { 
            competition_category_id: c4_web3.id, status: 'finished', venue: 'Room A',
            live_state: { matchStatus: 'finished', rankings:[{ id: p4_web3[0].id, name: p4_web3[0].name, rank: 1 }, { id: p4_web3[1].id, name: p4_web3[1].name, rank: 2 }, { id: p4_web3[2].id, name: p4_web3[2].name, rank: 3 }], timerRunning: false, timerSecs: 0 }
        }));
        await client.request(createItems('match_participants', p4_web3.map((p, i) => ({ match_id: m4_web3_f.id, participant_id: p.id, position: i + 1 }))));
        allMatchIdsToDenorm.push(m4_web3_f.id);

        // AI - LIVE (Partial leaderboard)
        const p4_ai = await genHackTeams(c4_ai.id);
        const m4_ai_l = await client.request(createItem('matches', { 
            competition_category_id: c4_ai.id, status: 'live', venue: 'Audit Hall',
            live_state: { matchStatus: 'live', rankings: [{ id: p4_ai[2].id, name: p4_ai[2].name, rank: 1 }], timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 21600 } 
        }));
        await client.request(createItems('match_participants', p4_ai.map((p, i) => ({ match_id: m4_ai_l.id, participant_id: p.id, position: i + 1 }))));
        allMatchIdsToDenorm.push(m4_ai_l.id);

        // Cyber - UPCOMING
        const p4_cyber = await genHackTeams(c4_cyber.id);
        const m4_cyber_u = await client.request(createItem('matches', { competition_category_id: c4_cyber.id, status: 'upcoming', venue: 'Lab 1', live_state: { matchStatus: 'upcoming', rankings:[], timerRunning: false, timerSecs: 86400 } }));
        await client.request(createItems('match_participants', p4_cyber.map((p, i) => ({ match_id: m4_cyber_u.id, participant_id: p.id, position: i + 1 }))));

        await client.request(createItems('news',[
            { author_id: me.id, event_id: e4.id, category: 'news', is_published: true, title: 'Hacking Phase Tersisa 6 Jam, Ketegangan Meningkat', slug: 'h-1', excerpt: 'Para peserta HackToday berlomba dengan waktu untuk men-deploy model AI mereka.', 
              content: 'Suasana di dalam Auditorium AHN IPB saat ini terasa sangat intens. Aroma kopi pekat dan bunyi ketikan keyboard mekanikal mendominasi seisi ruangan. Kompetisi HackToday 2026 telah memasuki jam ke-18 dari total waktu 24 jam non-stop yang diberikan kepada para peserta.\n\nBerdasarkan pantauan langsung, sebagian besar tim unggulan sedang berjuang keras mengintegrasikan model Machine Learning mereka ke backend aplikasi mobile. Beberapa peserta terlihat kelelahan, menyempatkan diri tidur sebentar di beanbag yang disediakan panitia di pojok ruangan.\n\n"Kami menemui bug yang cukup rumit di sistem pengenalan hama daun, namun kami optimis bisa menyelesaikannya sebelum waktu habis," ujar salah satu hacker dari tim asal Bandung yang matanya tampak memerah akibat kurang tidur.' },
            { author_id: me.id, event_id: e4.id, category: 'announcement', is_published: true, title: 'Hadirkan Juri dari Raksasa Tech Multinasional', slug: 'h-2', excerpt: 'Total hadiah 50 juta rupiah dengan juri langsung dari Google dan GoTo.', 
              content: 'Kualitas kompetisi IT-TODAY tahun ini naik kelas secara signifikan. Panitia berhasil menggandeng sejumlah raksasa teknologi (tech giants) untuk bertindak langsung sebagai juri panel pada fase Pitching besok pagi.\n\nDirektur Kemahasiswaan IPB mengapresiasi kerja keras himpunan mahasiswa Ilmu Komputer atas pencapaian ini. "Kesempatan dinilai langsung oleh praktisi industri kelas kakap adalah hadiah yang jauh lebih berharga daripada uang tunai. Ini adalah gerbang networking dan rekrutmen langsung bagi para talenta muda kita," tuturnya.\n\nSetiap tim nantinya hanya akan diberikan waktu 5 menit presentasi ditambah 10 menit sesi tanya jawab teknis yang dipastikan akan sangat menantang dan mencekam.' }
        ]));


        // ====================================================================
        // EVENT 5: IPB FUTSAL CUP (Timed H2H)
        // Format Coverage: score_timed + countdown + periods
        // States: Finished, Live, Upcoming
        // ====================================================================
        console.log("⚽[5/6] Seeding IPB FUTSAL CUP...");
        const e5 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IPB FUTSAL CUP 2026', slug: 'ipb-futsal-2026', type: 'sport', status: 'active', is_published: true, location: 'GOR Futsal IPB', start_date: offsetDays(-2), end_date: offsetDays(10), registration_end_date: offsetDays(7),
            description: `The IPB Futsal Cup is the university's most high-octane sporting event. Universities clash in a week-long battle for dominance.`
        }));

        const i5_ids = await seedInstitutionsForEvent(e5.id); 
        const f5_timed = await client.request(createItem('match_formats', { event_id: e5.id, name: 'Futsal Timed 2x20', match_type: 'head_to_head', modules:[{ type: 'score_timed', config: { has_periods: true, period_count: 2, period_term: 'Babak' } }, { type: 'timer', config: { mode: 'countdown', duration: 1200 } }] }));
        const c5_futsal = await client.request(createItem('competition_categories', { event_id: e5.id, format_id: f5_timed.id, name: 'Beregu Putra', participant_type: 'team' }));

        const p5_p =[];
        for(let i=0; i<6; i++) {
            const res = await client.request(createItem('participants', { name: `FC ${generateName().split(' ')[0]}`, competition_category_id: c5_futsal.id, institution_id: randomPick(i5_ids) }));
            p5_p.push(res.id);
        }

        // Group Stage - FINISHED
        const m5_f = await client.request(createItem('matches', { 
            competition_category_id: c5_futsal.id, status: 'finished', round: 'Group A', venue: 'Pitch A', home_participant_id: p5_p[0], away_participant_id: p5_p[1],
            live_state: { matchStatus: 'finished', homeScore: 5, awayScore: 2, periodIdx: 1, periodPhase: 'finished', winner: p5_p[0], timerRunning: false, timerSecs: 0 }
        }));
        
        // Group Stage - LIVE (2nd Half, Tied)
        const m5_l = await client.request(createItem('matches', { 
            competition_category_id: c5_futsal.id, status: 'live', round: 'Group A', venue: 'Pitch B', home_participant_id: p5_p[2], away_participant_id: p5_p[3],
            live_state: { matchStatus: 'live', homeScore: 2, awayScore: 2, periodIdx: 1, periodPhase: 'active', timerRunning: true, timerLastStarted: new Date().toISOString(), timerSecs: 600 } // 10 mins left in 2nd half
        }));

        // Group Stage - UPCOMING
        const m5_u = await client.request(createItem('matches', { competition_category_id: c5_futsal.id, status: 'upcoming', round: 'Group B', venue: 'Pitch A', scheduled_at: offsetHours(4), home_participant_id: p5_p[4], away_participant_id: p5_p[5] }));
        
        allMatchIdsToDenorm.push(m5_f.id, m5_l.id);

        await client.request(createItems('news',[
            { author_id: me.id, event_id: e5.id, category: 'announcement', is_published: true, title: 'Drawing Grup A Menegangkan: Tuan Rumah Bertemu Rival Klasik', slug: 'f-1', excerpt: 'Hasil drawing menempatkan tim unggulan di grup neraka.', 
              content: 'Pengundian fase grup IPB Futsal Cup yang digelar semalam di Student Center membuahkan hasil yang memicu riuh rendah perwakilan tim. Tuan rumah dipastikan harus satu grup dengan musuh bebuyutannya di dalam Grup A yang langsung dijuluki oleh para pandit kampus sebagai "Grup Neraka".\n\nKedua raksasa lapangan hijau kampus ini memiliki sejarah rivalitas yang panjang dan kerap kali memperagakan tensi pertandingan yang sangat tinggi di atas lapangan. Pertemuan terakhir mereka di turnamen nasional berujung pada kemenangan tipis lawan melalui drama adu penalti yang menguras emosi.\n\n"Kami sudah melakukan evaluasi besar-besaran sejak kekalahan menyakitkan tahun lalu. Bermain di kandang sendiri dengan dukungan penuh suporter se-fakultas akan menjadi keuntungan psikologis besar bagi mental bertanding anak-anak," tegas sang pelatih kepala dengan nada optimis saat konferensi pers.' },
            { author_id: me.id, event_id: e5.id, category: 'update', is_published: true, title: 'Protokol Keamanan Ekstra Seputar Venue', slug: 'f-2', excerpt: 'Polisi Kampus siapkan skema sterilisasi demi kenyamanan bersama.', 
              content: 'Mengingat tingginya antusiasme serta sejarah tensi suporter dari berbagai fakultas dan universitas yang berlaga, panitia penyelenggara IPB Futsal Cup telah berkoordinasi erat dengan pihak Kepolisian Kampus (Polkam) IPB.\n\nDalam rilis resminya, panitia melarang keras penggunaan petasan, suar (flare), dan membawa botol kaca di dalam radius 100 meter dari GOR Futsal IPB. "Kami sangat menghargai semangat dan kreativitas suporter dalam membuat koreografi, namun keselamatan dan kenyamanan semua pihak penonton adalah prioritas mutlak kami. Tim yang kelompok suporternya kedapatan melanggar regulasi keamanan ini akan dikenakan sanksi tegas berupa pengurangan poin klasemen," demikian kutipan dari buku panduan tata tertib terbaru.\n\nLangkah preventif ini diambil demi memastikan jalannya turnamen menjunjung tinggi semangat fair play dan mempererat persaudaraan antar mahasiswa.' }
        ]));


        // ====================================================================
        // EVENT 6: IPB ART FESTIVAL (Vocal Solo)
        // Format Coverage: judge_scores + notes
        // States: Finished, Live, Upcoming
        // ====================================================================
        console.log("🎤[6/6] Seeding IPB ART FESTIVAL...");
        const e6 = await client.request(createItem('events', { 
            user_created: me.id, name: 'IPB ART FESTIVAL 2026', slug: 'ipb-art-fest-2026', type: 'arts', status: 'active', is_published: true, location: 'Gedung Graha Widya Wisuda (GWW)', start_date: offsetDays(-1), end_date: offsetDays(1), registration_end_date: offsetDays(-30),
            description: `The biggest annual performing arts competition. Showcasing pristine vocal talents across universities.`
        }));

        const i6_ids = await seedInstitutionsForEvent(e6.id);
        const f6_judge = await client.request(createItem('match_formats', { event_id: e6.id, name: 'Vocal Solo Judging', match_type: 'solo', modules:[{ type: 'judge_scores', config: { num_judges: 3, method: 'avg', score_min: 0, score_max: 100, step: 1 } }, { type: 'notes', config: {} }] }));
        const c6_vocal = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_judge.id, name: 'Vocal Solo Pop', participant_type: 'individual' }));

        for (let i = 0; i < 5; i++) {
            const artist = await client.request(createItem('participants', { name: generateName(), competition_category_id: c6_vocal.id, institution_id: randomPick(i6_ids) }));
            const isFinished = i < 3;
            
            let state = { matchStatus: 'upcoming' };
            if (isFinished) {
                state = { matchStatus: 'finished', judgeScores:[randomInt(75, 95), randomInt(75, 95), randomInt(75, 95)], notes: "Vocal range yang sangat luas. Penjiwaan luar biasa sepanjang lagu." };
            } else if (i === 3) {
                state = { matchStatus: 'live', judgeScores:[88, null, null], notes: "Sedang bernyanyi di atas panggung utama..." };
            }

            const match = await client.request(createItem('matches', { 
                competition_category_id: c6_vocal.id, status: isFinished ? 'finished' : (i===3 ? 'live' : 'upcoming'), venue: 'Main Stage', scheduled_at: offsetHours(i), home_participant_id: artist.id, live_state: state 
            }));
            if(isFinished || i === 3) allMatchIdsToDenorm.push(match.id);
        }

        await client.request(createItems('news',[
            { author_id: me.id, event_id: e6.id, category: 'news', is_published: true, title: 'Tata Cahaya Panggung Megah Sihir Para Penonton', slug: 'a-1', excerpt: 'Gedung GWW disulap menjadi concert hall bertaraf internasional.', 
              content: 'Para penonton yang memadati Gedung Graha Widya Wisuda (GWW) dibuat terpukau oleh setting panggung IPB Art Festival 2026. Alih-alih terlihat seperti panggung kampus pada umumnya, sistem tata cahaya dan tata suara (sound system) yang dipasang panitia malam ini benar-benar setara dengan konser musik profesional berskala besar.\n\nSistem peredam suara gedung dioptimalkan untuk memastikan kejernihan vokal setiap kontestan kategori Pop Solo dapat terdengar dengan artikulasi yang jelas hingga ke baris kursi paling belakang. "Kami bekerja keras dengan vendor produksi selama berbulan-bulan untuk menjamin agar kualitas audio malam ini bisa memfasilitasi rentang vokal ekstrem para seniman muda ini," ujar seksi acara ArtFest saat ditemui di belakang panggung.\n\nSorotan lampu LED dinamis mengikuti ritme dan dinamika lagu balada yang dibawakan peserta, menciptakan momen merinding massal bagi dewan juri dan seluruh hadirin.' },
            { author_id: me.id, event_id: e6.id, category: 'update', is_published: true, title: 'Persaingan Ketat di Kategori Vocal Solo Pop', slug: 'a-2', excerpt: 'Tiga penyanyi sudah mengantongi skor di atas 85, persaingan menuju juara semakin panas.', 
              content: 'Hari kedua penyelenggaraan IPB Art Festival menghadirkan tensi kompetisi yang sangat ketat, terutama di kategori Vocal Solo Pop. Berdasarkan papan skor sementara, tiga penyanyi berhasil memukau dewan juri dan sukses mencatatkan nilai rata-rata di atas angka 85.\n\nJuri utama, yang merupakan musisi papan atas nasional, mengakui bahwa standar kualitas peserta tahun ini jauh melampaui ekspektasinya. "Mereka bukan lagi sekadar bernyanyi dengan nada yang tepat, tapi mereka sudah mampu bercerita dan memberikan nyawa pada lagu yang dibawakan. Penguasaan teknik head voice dan falsetto yang ditunjukkan sungguh level profesional," komentarnya di akhir sesi pertama.\n\nBabak grand final akan diselenggarakan besok malam, di mana para peserta yang lolos akan diwajibkan menyanyikan satu lagu pilihan dewan juri dengan aransemen orkestra penuh.' }
        ]));


        // ====================================================================
        // DENORMALIZATION FIX
        // ====================================================================
        await triggerDenorm(allMatchIdsToDenorm);

        console.log("\n✅ THE LEGENDARY MASTER SEED IS COMPLETE!");
        console.log("Fully detailed combinations of H2H, Solo, Open + Score/Timer/Notes + Upcoming/Live/Finished injected.");

    } catch (err) { 
        console.error("❌ Seed failed:", err); 
        if(err.errors) console.error(JSON.stringify(err.errors, null, 2));
    }
}

runMegaMasterSeed();