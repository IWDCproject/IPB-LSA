import {
  createDirectus,
  rest,
  staticToken,
  createItem,
  createItems,
  updateItem,
  deleteItems,
  readMe,
  updateUser,
  readItems,
} from '@directus/sdk';

// ==========================================
// CONFIGURATION
// ==========================================
const ADMIN_TOKEN = 'ECH98IbvMYhkTbPM2sYWKsjeib3Bpgo2';
const client = createDirectus('http://localhost:7777').with(rest()).with(staticToken(ADMIN_TOKEN));

// ==========================================
// UTILITIES & GENERATORS
// ==========================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const offsetHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const offsetDays = (d) => new Date(Date.now() + d * 86400000).toISOString();
const toDate = (isoStr) => isoStr.split('T')[0];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max, step = 0.1) => {
  const val = min + Math.random() * (max - min);
  return Math.round(val / step) * step;
};
const fmtTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const firstNames = [
  'Budi', 'Agus', 'Siti', 'Ayu', 'Reza', 'Gilang', 'Surya', 'Rina', 'Dian', 'Dwi',
  'Tri', 'Eko', 'Hendra', 'Eka', 'Rizky', 'Dimas', 'Bayu', 'Aditya', 'Dinda', 'Putri',
  'Irfan', 'Fahmi', 'Kevin', 'Marcus', 'Jonatan', 'Anthony', 'Fajar', 'Handoko', 'Iman',
  'Joko', 'Kukuh', 'Lestari', 'Mira', 'Nanda', 'Omar', 'Prabowo', 'Qori', 'Sandra',
  'Taufik', 'Ulfa', 'Viona', 'Wahyu', 'Xena', 'Yoga', 'Zara', 'Andika', 'Bella',
  'Candra', 'Desta', 'Elsa', 'Firdaus', 'Galih', 'Hani', 'Ilham', 'Julia',
];
const lastNames = [
  'Saputra', 'Wijaya', 'Santoso', 'Pratama', 'Sari', 'Lestari', 'Setiawan', 'Hidayat',
  'Maulana', 'Rahardian', 'Wibowo', 'Kusuma', 'Haryanto', 'Nugroho', 'Siregar',
  'Simanjuntak', 'Ginting', 'Tambunan', 'Panjaitan', 'Nainggolan', 'Situmorang',
  'Hutabarat', 'Manurung', 'Napitupulu', 'Purba', 'Sinaga', 'Tobing',
];
let usedNames = new Set();
const generateName = () => {
  for (let i = 0; i < 50; i++) {
    const n = `${randomPick(firstNames)} ${randomPick(lastNames)}`;
    if (!usedNames.has(n)) { usedNames.add(n); return n; }
  }
  return `${randomPick(firstNames)} ${randomPick(lastNames)} ${randomInt(1, 99)}`;
};

const UNIVERSITIES = [
  { name: 'IPB University',                      color: '#06125C' },
  { name: 'Universitas Indonesia',               color: '#FFC936' },
  { name: 'Institut Teknologi Bandung',          color: '#00A3E1' },
  { name: 'Universitas Gadjah Mada',             color: '#1A5276' },
  { name: 'Universitas Padjadjaran',             color: '#E62129' },
  { name: 'Universitas Diponegoro',              color: '#004A8A' },
  { name: 'Universitas Airlangga',               color: '#FCD116' },
  { name: 'Institut Teknologi Sepuluh Nopember', color: '#0000FF' },
  { name: 'Universitas Brawijaya',               color: '#008000' },
  { name: 'Universitas Sebelas Maret',           color: '#8B0000' },
];

// ==========================================
// HELPER: SEED INSTITUTIONS
// ==========================================
async function seedInstitutions(eventId, count = 8) {
  const ids = [];
  for (const univ of UNIVERSITIES.slice(0, count)) {
    const res = await client.request(createItem('institutions', {
      event_id: eventId, name: univ.name, color: univ.color,
    }));
    ids.push(res.id);
  }
  return ids;
}

// ==========================================
// HELPER: TRIGGER DENORMALIZATION
// ==========================================
async function triggerDenorm(matchIds) {
  if (!matchIds.length) return;
  console.log(`   ⚙️  Triggering denorm for ${matchIds.length} matches...`);
  for (const id of matchIds) {
    await client.request(updateItem('matches', id, { updated_at: new Date().toISOString() }));
  }
}

// ==========================================
// LIVE_STATE FACTORY — one place, all engines
// ==========================================
const LS = {
  upcoming: () => ({ matchStatus: 'upcoming', timerRunning: false, timerSecs: 0 }),

  deadlineLive: ({ rankings = [], targetHours = 24 }) => ({
    matchStatus: 'live',
    rankings,
    timerRunning: true, 
    timerTarget: new Date(Date.now() + targetHours * 3600 * 1000).toISOString(),
    notes: '',
  }),

  // -- H2H score_timed --
  timedLive: ({ homeScore, awayScore, secs, periodIdx = 0, periodPhase = 'active' }) => ({
    matchStatus: 'live',
    homeScore, awayScore,
    periodIdx, periodPhase,
    timerRunning: true,
    timerSecs: secs,
    timerLastStarted: new Date().toISOString(),
    timerFlags: [],
    notes: '',
  }),
  timedFinished: ({ homeScore, awayScore, winner, secs = 0, periodIdx = 0, notes = '' }) => ({
    matchStatus: 'finished',
    homeScore, awayScore, winner,
    periodIdx, periodPhase: 'idle',
    timerRunning: false,
    timerSecs: secs,
    timerLastStarted: null,
    timerFlags: [],
    notes,
  }),

  // -- H2H score_sets --
  setsLive: ({ setIdx, setScore, setsWon, setLog, secs }) => ({
    matchStatus: 'live',
    setIdx, setScore, setsWon, setLog,
    setPhase: 'active', pendingSetWinner: null,
    timerRunning: true, timerSecs: secs, timerLastStarted: new Date().toISOString(),
    notes: '',
  }),
  setsFinished: ({ setsWon, setLog, winner, secs }) => ({
    matchStatus: 'finished',
    setIdx: setLog.length - 1,
    setScore: [setLog.at(-1).home, setLog.at(-1).away],
    setsWon, setLog, winner,
    setPhase: 'idle', pendingSetWinner: null,
    timerRunning: false, timerSecs: secs, timerLastStarted: null,
    notes: '',
  }),

  // -- Solo judge_scores --
  judgeLive: ({ scores, notes = '' }) => ({
    matchStatus: 'live',
    judgeScores: scores,
    timerRunning: true, timerSecs: 60, timerLastStarted: new Date().toISOString(),
    notes,
  }),
  judgeFinished: ({ scores, notes = '' }) => ({
    matchStatus: 'finished',
    judgeScores: scores,
    timerRunning: false, timerSecs: 0,
    notes,
  }),

  // -- Solo / Open finish_time --
  timeLive: ({ timeLog, rankings, secs }) => ({
    matchStatus: 'live',
    timeLog, rankings,
    timerRunning: true, timerSecs: secs, timerLastStarted: new Date().toISOString(),
  }),
  timeFinished: ({ timeLog, rankings, secs }) => ({
    matchStatus: 'finished',
    timeLog, rankings,
    timerRunning: false, timerSecs: secs,
  }),

  // -- Open manual_pick --
  pickUpcoming: () => ({ matchStatus: 'upcoming', rankings: [], timerRunning: false, timerSecs: 0 }),
  pickLive: ({ rankings, secs }) => ({
    matchStatus: 'live',
    rankings,
    timerRunning: true, timerSecs: secs, timerLastStarted: new Date().toISOString(),
    notes: '',
  }),
  pickFinished: ({ rankings }) => ({
    matchStatus: 'finished',
    rankings,
    timerRunning: false, timerSecs: 0, timerLastStarted: null,
    notes: '',
  }),

  // -- EDGE CASES --
  // Corrupted timer (timerRunning=true but no timerLastStarted) — tests frontend resilience
  corruptedTimer: ({ homeScore, awayScore }) => ({
    matchStatus: 'live',
    homeScore, awayScore,
    timerRunning: true, timerSecs: 90, timerLastStarted: null, // corrupt
  }),
  // Countdown at zero — tests clamp to 0
  countdownExhausted: ({ homeScore, awayScore }) => ({
    matchStatus: 'live',
    homeScore, awayScore,
    timerRunning: false, timerSecs: 0, timerLastStarted: null,
  }),
  // Draw
  timedDraw: ({ homeScore, awayScore, secs = 0 }) => ({
    matchStatus: 'finished',
    homeScore, awayScore, winner: null,
    timerRunning: false, timerSecs: secs, timerLastStarted: null,
  }),
  // Cancelled — live_state left as upcoming
  cancelled: () => ({ matchStatus: 'upcoming', timerRunning: false, timerSecs: 0 }),
};

// ==========================================
// MAIN SEED ENGINE
// ==========================================
async function seed() {
  try {
    console.log('🚀 ULTIMATE SEED v3 — FULL COVERAGE\n');

    const me = await client.request(readMe());
    const myId = me.id;
    await client.request(updateUser(myId, { organisation_name: 'IWDC IPB' }));
    console.log('👤 Organisation: IWDC IPB');

    console.log('🧹 Wiping all existing data...');
    const wipe = ['match_participants', 'matches', 'participants', 'competition_categories', 'match_formats', 'institutions', 'event_phases', 'news', 'events'];
    for (const col of wipe) {
      try { await client.request(deleteItems(col, { limit: -1 })); } catch (_) {}
    }
    await sleep(2000);
    console.log('✅ Wipe done.\n');

    const denormQueue = [];

    // ====================================================================
    // EVENT 1: FORKI × IPB CUP 2026 — KARATE
    // Formats: judge_scores + timer (solo kata), score_timed + timer (kumite)
    // Participants: 20 kata, 16 kumite (seeded bracket)
    // Matches: every status + cancelled + draw
    // ====================================================================
    console.log('🥋 [1/6] FORKI × IPB CUP 2026 — Karate...');
    const e1 = await client.request(createItem('events', {
      user_created: myId,
      name: 'FORKI × IPB CUP 2026',
      slug: 'forki-ipb-2026',
      type: 'sport',
      status: 'active',
      is_published: true,
      location: 'Gymnasium IPB Dramaga, Bogor',
      start_date: toDate(offsetDays(-3)),
      end_date: toDate(offsetDays(1)),
      registration_end_date: offsetDays(-20),
      is_registration_open: false,
      registration_url: 'https://ipb.link/forki-2026-reg',
      guidebook_url: 'https://ipb.link/forki-2026-guide',
      instagram_url: 'https://instagram.com/ukmkarate_ipb',
      website_url: 'https://karate.ipb.ac.id',
      description: `FORKI × IPB CUP 2026 adalah turnamen karate antar perguruan tinggi bergengsi yang diselenggarakan bekerja sama dengan Federasi Olahraga Karate-Do Indonesia (FORKI). Memasuki edisi ke-5, kompetisi ini tidak hanya menjadi ajang unjuk gigi bagi lebih dari 200 atlet mahasiswa dari seluruh Indonesia, tetapi juga sarana pencarian bakat resmi untuk persiapan Pelatnas dan PON mendatang.

Tahun ini, penyelenggara menghadirkan inovasi besar dengan menerapkan sistem penjurian elektronik berstandar World Karate Federation (WKF) secara penuh. Sistem ini memastikan transparansi, kecepatan, dan objektivitas maksimal di setiap pertandingan, baik di kategori Kata maupun Kumite.

Selain pertandingan utama, turnamen ini juga menghadirkan seminar bela diri, pameran perlengkapan olahraga, dan sesi temu sapa dengan legenda karate nasional, menjadikannya festival seni bela diri yang komprehensif bagi seluruh partisipan dan penonton.`,
      contact_person: JSON.stringify({ name: 'Ahmad Fauzi', phone: '081234567890', email: 'karate@ipb.ac.id' }),
    }));

    await client.request(createItems('event_phases',[
      { event_id: e1.id, label: 'Technical Meeting', description: 'Briefing teknis komprehensif bagi seluruh perwakilan dojo dan universitas. Sesi ini akan membahas pembaruan regulasi WKF terbaru, tata tertib arena, serta pengundian (drawing) bracket secara transparan untuk seluruh kelas yang dipertandingkan.', date_start: toDate(offsetDays(-5)), time_start: '14:00', status: 'done', display_order: 1 },
      { event_id: e1.id, label: 'Babak Penyisihan', description: 'Fase eliminasi awal di mana seluruh atlet dari berbagai kelas Kumite dan Kata berlaga secara serentak di tiga tatami berbeda. Pertandingan akan diawasi langsung oleh panel juri berlisensi nasional dari FORKI.', date_start: toDate(offsetDays(-2)), time_start: '08:00', status: 'done', display_order: 2 },
      { event_id: e1.id, label: 'Babak Semifinal', description: 'Pertarungan sengit menuju partai puncak yang mempertemukan empat atlet terbaik (Top 4) dari setiap kelas. Tekanan mental dan fisik akan diuji karena pertandingan dipusatkan di Tatami Utama dengan sorotan penuh penonton.', date_start: toDate(offsetDays(-1)), time_start: '08:00', status: 'done', display_order: 3 },
      { event_id: e1.id, label: 'Final & Awarding', description: 'Hari paling mendebarkan di mana perebutan medali emas berlangsung. Seluruh partai final dimainkan secara berurutan, ditutup dengan upacara pengalungan medali dan penyerahan piala bergilir kepada juara umum turnamen.', date_start: toDate(offsetDays(0)), time_start: '09:00', status: 'current', display_order: 4 },
      { event_id: e1.id, label: 'Penutupan', description: 'Acara seremonial resmi untuk menutup keseluruhan rangkaian FORKI × IPB CUP 2026. Meliputi pidato penutupan dari Rektor IPB, sesi foto bersama seluruh kontingen, dan pelepasan panitia.', date_start: toDate(offsetDays(1)), time_start: '16:00', status: 'upcoming', display_order: 5 },
    ]));

    const i1 = await seedInstitutions(e1.id, 10);

    // Formats
    const f1_kata = await client.request(createItem('match_formats', {
      event_id: e1.id, name: 'Kata Perorangan – Drop Extremes',
      match_type: 'solo',
      modules: [
        { type: 'judge_scores', config: { num_judges: 5, method: 'drop_extremes', score_min: 5, score_max: 10, step: 0.1 } },
        { type: 'timer', config: { mode: 'stopwatch' } },
        { type: 'notes', config: {} },
      ],
    }));
    const f1_kata_avg = await client.request(createItem('match_formats', {
      event_id: e1.id, name: 'Kata Beregu – Average',
      match_type: 'solo',
      modules: [
        { type: 'judge_scores', config: { num_judges: 5, method: 'avg', score_min: 5, score_max: 10, step: 0.1 } },
        { type: 'timer', config: { mode: 'stopwatch' } },
      ],
    }));
    const f1_kumi = await client.request(createItem('match_formats', {
      event_id: e1.id, name: 'Kumite – Timed No Periods',
      match_type: 'head_to_head',
      modules: [
        { type: 'score_timed', config: { score_label: 'Poin', has_periods: false } },
        { type: 'timer', config: { mode: 'countdown', duration: 180 } },
        { type: 'notes', config: {} },
      ],
    }));
    const f1_kumi_period = await client.request(createItem('match_formats', {
      event_id: e1.id, name: 'Kumite – 2 Babak',
      match_type: 'head_to_head',
      modules: [
        { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_count: 2, period_term: 'Babak' } },
        { type: 'timer', config: { mode: 'countdown', duration: 120 } },
      ],
    }));

    // Categories
    const c1_kata_putra  = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata.id, name: 'Kata Perorangan Putra', participant_type: 'individual', display_order: 1 }));
    const c1_kata_putri  = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata.id, name: 'Kata Perorangan Putri', participant_type: 'individual', display_order: 2 }));
    const c1_kata_beregu = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata_avg.id, name: 'Kata Beregu Campuran', participant_type: 'team', display_order: 3 }));
    const c1_k55         = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi.id, name: 'Kumite Putra -55kg', participant_type: 'individual', display_order: 4 }));
    const c1_k60         = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi.id, name: 'Kumite Putra -60kg', participant_type: 'individual', display_order: 5 }));
    const c1_k67         = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi_period.id, name: 'Kumite Putra -67kg', participant_type: 'individual', display_order: 6 }));
    const c1_kw50        = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kumi.id, name: 'Kumite Putri -50kg', participant_type: 'individual', display_order: 7 }));
    // Edge: category with no format assigned
    // Edge: category exists but has 0 matches (tests empty state)
    const c1_unassigned  = await client.request(createItem('competition_categories', { event_id: e1.id, format_id: f1_kata.id, name: 'Kata Beregu Junior (Pending Format)', participant_type: 'team', display_order: 8 }));

    // -- Kata Perorangan Putra — 8 participants, full bracket --
    const mkp = [];
    for (let i = 0; i < 8; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c1_kata_putra.id,
        institution_id: i1[i % i1.length],
        name: generateName(),
        seed: i + 1,
      }));
      mkp.push(p);
    }
    // Round 1 — all 4 pairs
    const kata_r1_matches = [];
    for (let i = 0; i < 4; i++) {
      const scores = [randomFloat(7, 9.5), randomFloat(7, 9.5), randomFloat(7, 9.5), randomFloat(7, 9.5), randomFloat(7, 9.5)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c1_kata_putra.id,
        status: 'finished', round: 'Round 1', match_name: `R1-Tatami ${i + 1}`,
        venue: `Tatami ${i + 1}`, scheduled_at: offsetHours(-48 + i * 2),
        home_participant_id: mkp[i * 2].id,
        live_state: LS.judgeFinished({ scores, notes: `Eksekusi Heian Shodan sangat tepat. Kime kuat.` }),
      }));
      kata_r1_matches.push(m);
      denormQueue.push(m.id);
    }
    // Semifinal — 2 matches: 1 finished, 1 live
    const m_kata_sf1 = await client.request(createItem('matches', {
      competition_category_id: c1_kata_putra.id,
      status: 'finished', round: 'Semifinal', match_name: 'SF-1', venue: 'Tatami Utama',
      scheduled_at: offsetHours(-10), home_participant_id: mkp[0].id,
      live_state: LS.judgeFinished({ scores: [8.5, 8.3, 8.7, 8.4, 8.6], notes: 'Kime luar biasa pada teknik terakhir.' }),
    }));
    denormQueue.push(m_kata_sf1.id);
    const m_kata_sf2 = await client.request(createItem('matches', {
      competition_category_id: c1_kata_putra.id,
      status: 'live', round: 'Semifinal', match_name: 'SF-2', venue: 'Tatami Utama',
      scheduled_at: offsetHours(-1), home_participant_id: mkp[4].id,
      live_state: LS.judgeLive({ scores: [8.8, null, null, null, null], notes: 'Sedang tampil...' }),
    }));
    denormQueue.push(m_kata_sf2.id);
    // Final — upcoming
    await client.request(createItem('matches', {
      competition_category_id: c1_kata_putra.id,
      status: 'upcoming', round: 'Final', match_name: 'Grand Final', venue: 'Tatami Utama',
      scheduled_at: offsetHours(3), home_participant_id: mkp[0].id,
    }));

    // -- Kata Perorangan Putri — finished, live, upcoming --
    const mkpi = [];
    for (let i = 0; i < 6; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c1_kata_putri.id, institution_id: i1[i % i1.length], name: generateName(), seed: i + 1 }));
      mkpi.push(p);
    }
    for (let i = 0; i < 3; i++) {
      const isLive = i === 1;
      const isUpcoming = i === 2;
      const scores = [randomFloat(7.5, 9.5), randomFloat(7.5, 9.5), randomFloat(7.5, 9.5), randomFloat(7.5, 9.5), randomFloat(7.5, 9.5)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c1_kata_putri.id,
        status: isUpcoming ? 'upcoming' : isLive ? 'live' : 'finished',
        round: 'Round 1', venue: 'Tatami 2', scheduled_at: offsetHours(-20 + i * 8),
        home_participant_id: mkpi[i].id,
        live_state: isUpcoming ? LS.upcoming() : isLive ? LS.judgeLive({ scores: [scores[0], null, null, null, null] }) : LS.judgeFinished({ scores }),
      }));
      if (!isUpcoming) denormQueue.push(m.id);
    }

    // -- Kata Beregu — teams --
    const kbTeams = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c1_kata_beregu.id,
        institution_id: i1[i],
        name: `Tim Kata ${UNIVERSITIES[i].name.split(' ')[0]}`,
        members: JSON.stringify([{ name: generateName(), role: 'Anggota 1' }, { name: generateName(), role: 'Anggota 2' }, { name: generateName(), role: 'Anggota 3' }]),
      }));
      kbTeams.push(p);
    }
    const m_kb_f = await client.request(createItem('matches', {
      competition_category_id: c1_kata_beregu.id, status: 'finished', round: 'Final',
      venue: 'Tatami Utama', scheduled_at: offsetHours(-6), home_participant_id: kbTeams[0].id,
      live_state: LS.judgeFinished({ scores: [9.0, 8.8, 9.1, 8.9, 9.0], notes: 'Sinkronisasi gerakan sempurna.' }),
    }));
    denormQueue.push(m_kb_f.id);
    await client.request(createItem('matches', {
      competition_category_id: c1_kata_beregu.id, status: 'upcoming', round: 'Final',
      venue: 'Tatami Utama', scheduled_at: offsetHours(4), home_participant_id: kbTeams[1].id,
      live_state: LS.upcoming(),
    }));

    // -- Kumite -60kg — full bracket 8 athletes + DRAW edge case --
    const kk60 = [];
    for (let i = 0; i < 8; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c1_k60.id, institution_id: i1[i % i1.length], name: generateName(), seed: i + 1 }));
      kk60.push(p.id);
    }
    // R16 - 4 matches all finished
    for (let i = 0; i < 4; i++) {
      const hS = randomInt(2, 8); const aS = randomInt(0, hS - 1);
      const m = await client.request(createItem('matches', {
        competition_category_id: c1_k60.id, status: 'finished', round: 'Perempat Final',
        venue: `Tatami ${i + 1}`, scheduled_at: offsetHours(-36 + i),
        home_participant_id: kk60[i * 2], away_participant_id: kk60[i * 2 + 1],
        live_state: LS.timedFinished({ homeScore: hS, awayScore: aS, winner: kk60[i * 2], secs: 0, notes: 'WazaAri yang bersih di menit terakhir.' }),
      }));
      denormQueue.push(m.id);
    }
    // SF1 - finished
    const m_k60_sf1 = await client.request(createItem('matches', {
      competition_category_id: c1_k60.id, status: 'finished', round: 'Semifinal',
      venue: 'Tatami Utama', scheduled_at: offsetHours(-20),
      home_participant_id: kk60[0], away_participant_id: kk60[2],
      live_state: LS.timedFinished({ homeScore: 5, awayScore: 2, winner: kk60[0], secs: 0 }),
    }));
    denormQueue.push(m_k60_sf1.id);
    // SF2 - LIVE (corrupted timer edge case)
    const m_k60_sf2 = await client.request(createItem('matches', {
      competition_category_id: c1_k60.id, status: 'live', round: 'Semifinal',
      venue: 'Tatami Utama', scheduled_at: offsetHours(-1),
      home_participant_id: kk60[4], away_participant_id: kk60[6],
      live_state: LS.corruptedTimer({ homeScore: 1, awayScore: 1 }), // EDGE: corrupted timer
    }));
    denormQueue.push(m_k60_sf2.id);
    // 3rd Place — DRAW edge case
    const m_k60_3rd = await client.request(createItem('matches', {
      competition_category_id: c1_k60.id, status: 'finished', round: 'Perebutan 3rd',
      venue: 'Tatami 2', scheduled_at: offsetHours(-5),
      home_participant_id: kk60[2], away_participant_id: kk60[4],
      live_state: LS.timedDraw({ homeScore: 3, awayScore: 3 }), // EDGE: draw / null winner
    }));
    denormQueue.push(m_k60_3rd.id);
    // Final - UPCOMING
    await client.request(createItem('matches', {
      competition_category_id: c1_k60.id, status: 'upcoming', round: 'Grand Final',
      match_name: 'GOLD MEDAL MATCH', venue: 'Tatami Utama', scheduled_at: offsetHours(2),
      home_participant_id: kk60[0], away_participant_id: kk60[6],
      live_state: LS.upcoming(),
    }));

    // -- Kumite -55kg — smaller, all finished --
    const kk55 = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c1_k55.id, institution_id: i1[i % i1.length], name: generateName(), seed: i + 1 }));
      kk55.push(p.id);
    }
    for (let i = 0; i < 2; i++) {
      const hS = randomInt(3, 7); const aS = randomInt(0, hS - 1);
      const m = await client.request(createItem('matches', {
        competition_category_id: c1_k55.id, status: 'finished', round: 'Final',
        venue: 'Tatami 3', scheduled_at: offsetHours(-12 + i * 2),
        home_participant_id: kk55[i * 2], away_participant_id: kk55[i * 2 + 1],
        live_state: LS.timedFinished({ homeScore: hS, awayScore: aS, winner: kk55[i * 2] }),
      }));
      denormQueue.push(m.id);
    }

    // -- Kumite -67kg — 2 periods --
    const kk67 = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c1_k67.id, institution_id: i1[i % i1.length], name: generateName() }));
      kk67.push(p.id);
    }
    const m_k67_live = await client.request(createItem('matches', {
      competition_category_id: c1_k67.id, status: 'live', round: 'Final',
      venue: 'Tatami 2', scheduled_at: offsetHours(-1),
      home_participant_id: kk67[0], away_participant_id: kk67[1],
      live_state: LS.timedLive({ homeScore: 2, awayScore: 1, secs: 85, periodIdx: 1, periodPhase: 'active' }),
    }));
    denormQueue.push(m_k67_live.id);

    // -- Kumite Putri -50kg — CANCELLED edge case --
    const kw50 = [];
    for (let i = 0; i < 2; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c1_kw50.id, institution_id: i1[i], name: generateName() }));
      kw50.push(p.id);
    }
    await client.request(createItem('matches', { // EDGE: cancelled match
      competition_category_id: c1_kw50.id, status: 'cancelled', round: 'Final',
      venue: 'Tatami 3', scheduled_at: offsetHours(-6),
      home_participant_id: kw50[0], away_participant_id: kw50[1],
      live_state: LS.cancelled(),
    }));
    // Edge: category exists but has 0 matches (c1_unassigned) — tests empty state

    // News for E1
    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e1.id, category: 'announcement', is_published: true,
        published_at: offsetDays(-3), title: 'FORKI × IPB Cup 2026 Resmi Dibuka — Sistem Penjurian Elektronik WKF Diaktifkan',
        slug: 'e1-n1',
        excerpt: 'Untuk pertama kalinya dalam sejarah turnamen ini, sistem penjurian elektronik berstandar WKF digunakan secara penuh.',
        content: 'Turnamen FORKI × IPB Cup 2026 resmi dibuka dengan upacara megah yang dihadiri oleh Rektor IPB University dan perwakilan FORKI Pusat. Yang paling menarik perhatian adalah peluncuran sistem penjurian elektronik berstandar World Karate Federation (WKF), pertama kalinya diterapkan di kompetisi karate kampus tingkat nasional.\n\nSistem ini menggunakan tablet khusus untuk setiap juri, terintegrasi real-time dengan sistem skor digital yang ditampilkan di layar besar venue. Ketua FORKI Jawa Barat menyatakan bahwa langkah ini sangat signifikan dalam meningkatkan objektivitas penilaian, terutama untuk cabang Kata yang selama ini rentan terhadap subjektivitas.\n\n"Kami bangga IPB menjadi pelopor. Ini adalah warisan yang akan dicontoh oleh turnamen lain," ujar Ketua Panitia.',
      },
      {
        author_id: myId, event_id: e1.id, category: 'result', is_published: true,
        published_at: offsetDays(-1), title: 'Dominasi IPB di Babak Penyisihan — 5 Atlet Melaju ke Semifinal',
        slug: 'e1-n2',
        excerpt: 'Tuan rumah IPB University menorehkan hasil impresif dengan 5 atletnya memastikan tempat di babak semifinal.',
        content: 'Hari kedua pelaksanaan babak penyisihan FORKI × IPB Cup 2026 menjadi milik tuan rumah. Lima atlet IPB University dari berbagai kelas berat berhasil melaju ke babak semifinal yang akan digelar besok.\n\nPenampilan paling memukau datang dari kelas Kumite Putra -60kg, di mana atlet andalan IPB berhasil mengakhiri pertandingan lebih cepat dari jadwal dengan kemenangan telak 8-0 melalui ippon yang tidak terbantahkan. Publik tuan rumah yang memadati gymnasium pun langsung meledak dalam sorak sorai.\n\nPerekrut nasional yang hadir sebagai peninjau resmi menyebut setidaknya dua nama dari turnamen ini berpotensi masuk radar seleksi Pelatnas PON mendatang.',
      },
      {
        author_id: myId, event_id: e1.id, category: 'news', is_published: true,
        published_at: offsetHours(-8), title: 'Pertarungan Terpanas: Rivalitas 5 Tahun Berlanjut di Tatami Utama',
        slug: 'e1-n3',
        excerpt: 'Dua atlet yang telah bertemu di final 3 tahun berturut-turut kembali bersua di semifinal.',
        content: 'Kisah rivalitas yang sudah berlangsung selama lima tahun di tatami kompetisi akan mencapai babak terbarunya sore ini. Dua nama yang selalu mendominasi podium Kumite -67kg dipastikan akan berhadapan di babak semifinal, setelah keduanya melibas lawan-lawan di ronde sebelumnya tanpa kesulitan berarti.\n\nPertemuan terakhir mereka di Kejurnas tahun lalu berakhir dengan kemenangan kontroversial satu poin, meninggalkan rasa penasaran yang kini menuntut penyelesaian di hadapan ribuan penonton.',
      },
      {
        author_id: myId, event_id: e1.id, category: 'update', is_published: true,
        published_at: offsetHours(-2), title: 'Update Jadwal: Partai Final Kumite -60kg Mundur 30 Menit',
        slug: 'e1-n4',
        excerpt: 'Penundaan teknis akibat kalibrasi ulang sensor penjurian di Tatami Utama.',
        content: 'Panitia FORKI × IPB Cup 2026 mengumumkan penundaan jadwal partai Grand Final Kumite Putra -60kg selama 30 menit dari jadwal semula. Penundaan ini disebabkan oleh kebutuhan kalibrasi ulang perangkat sensor penjurian elektronik di Tatami Utama yang mengalami gangguan koneksi sesaat.\n\nTim teknis memastikan seluruh sistem akan kembali berfungsi optimal sebelum pertandingan dimulai. Penonton dimohon untuk tetap berada di tempat duduk dan menikmati penampilan demonstrasi dari klub karate junior IPB yang sudah disiapkan sebagai pengisi waktu.',
      },
      {
        author_id: myId, event_id: e1.id, category: 'announcement', is_published: false, // EDGE: unpublished
        published_at: null, title: '[DRAFT] Rencana Ekspansi Kategori Tahun Depan',
        slug: 'e1-n5-draft',
        excerpt: 'Draft internal — belum dipublish.',
        content: 'Draft artikel tentang rencana ekspansi kategori untuk edisi 2027.',
      },
    ]));

    // ====================================================================
    // EVENT 2: IPB BADMINTON CUP 2026
    // Formats: score_sets + stopwatch (tunggal), score_sets + stopwatch (ganda)
    // Participants: 12 tunggal, 8 ganda (team)
    // Matches: full bracket including exhausted countdown edge case
    // ====================================================================
    console.log('🏸 [2/6] IPB BADMINTON CUP 2026...');
    const e2 = await client.request(createItem('events', {
      user_created: myId,
      name: 'IPB BADMINTON CUP 2026',
      slug: 'ipb-badminton-2026',
      type: 'sport',
      status: 'active',
      is_published: true,
      location: 'GOR Badminton IPB, Dramaga',
      start_date: toDate(offsetDays(-2)),
      end_date: toDate(offsetDays(3)),
      registration_end_date: offsetDays(-21),
      is_registration_open: false,
      registration_url: 'https://ipb.link/badminton-2026',
      guidebook_url: 'https://ipb.link/badminton-guide',
      instagram_url: 'https://instagram.com/ipbbadmintoncup',
      website_url: 'https://badminton.ipb.ac.id',
      description: `IPB Badminton Cup 2026 merupakan kejuaraan bulutangkis tingkat perguruan tinggi yang mempertandingkan talenta-talenta terbaik dari lebih dari 10 universitas terkemuka di Indonesia. Turnamen ini dilaksanakan dengan standar regulasi resmi dari Badminton World Federation (BWF) untuk memastikan kualitas pertandingan di level tertinggi.

Selain memperebutkan piala bergilir dan total hadiah puluhan juta rupiah, kompetisi yang kini memasuki tahun ke-8 penyelenggaraannya ini bertujuan kuat untuk membina semangat sportivitas, mental juara, serta mempererat tali persaudaraan antar mahasiswa melalui olahraga. 

Dengan kapasitas GOR Badminton IPB yang mampu menampung ribuan penonton, IPB Badminton Cup tahun ini diproyeksikan menghadirkan atmosfer tribun yang riuh dan ikonik, menjadikannya salah satu turnamen kampus yang paling dinantikan di wilayah Jabodetabek.`,
    }));

    await client.request(createItems('event_phases',[
      { event_id: e2.id, label: 'Registrasi Peserta', description: 'Periode pendaftaran terbuka melalui portal terintegrasi IPB. Seluruh calon peserta diwajibkan mengunggah kelengkapan administrasi seperti Kartu Tanda Mahasiswa (KTM) aktif dan surat rekomendasi dari institusi asal.', date_start: toDate(offsetDays(-45)), time_start: '08:00', status: 'done', display_order: 1 },
      { event_id: e2.id, label: 'Technical Meeting', description: 'Pertemuan wajib bagi seluruh manajer tim untuk melakukan proses pengundian (drawing) fase grup secara langsung. Panitia juga akan menjelaskan regulasi pertandingan, tata letak lapangan, dan sistem poin yang digunakan.', date_start: toDate(offsetDays(-3)), time_start: '14:00', status: 'done', display_order: 2 },
      { event_id: e2.id, label: 'Fase Grup', description: 'Tahap penyisihan dengan sistem kompetisi penuh (round robin) dalam masing-masing grup. Setiap atlet atau pasangan akan bertanding melawan seluruh anggota grupnya untuk memperebutkan poin maksimal menuju fase gugur.', date_start: toDate(offsetDays(-2)), time_start: '08:00', status: 'done', display_order: 3 },
      { event_id: e2.id, label: 'Perempat Final', description: 'Fase gugur yang sangat krusial, mempertemukan dua tim teratas (Juara dan Runner-up) dari masing-masing grup. Intensitas permainan dipastikan meningkat tajam karena satu kekalahan berarti tereliminasi dari turnamen.', date_start: toDate(offsetDays(0)), time_start: '09:00', status: 'current', display_order: 4 },
      { event_id: e2.id, label: 'Semifinal & Final', description: 'Puncak perhelatan di mana para semifinalis berjuang untuk tiket menuju Grand Final. Pertandingan pamungkas akan mempertandingkan format Best of 5 Sets, diakhiri dengan seremoni penganugerahan piala dan medali.', date_start: toDate(offsetDays(2)), time_start: '14:00', status: 'upcoming', display_order: 5 },
    ]));

    const i2 = await seedInstitutions(e2.id, 8);

    const f2_sets3 = await client.request(createItem('match_formats', {
      event_id: e2.id, name: 'BWF — Best of 3 Sets',
      match_type: 'head_to_head',
      modules: [
        { type: 'score_sets', config: { score_label: 'Poin', term: 'Set', max_sets: 3, sets_to_win: 2 } },
        { type: 'timer', config: { mode: 'stopwatch' } },
        { type: 'notes', config: {} },
      ],
    }));
    const f2_sets5 = await client.request(createItem('match_formats', {
      event_id: e2.id, name: 'BWF — Best of 5 Sets (Final)',
      match_type: 'head_to_head',
      modules: [
        { type: 'score_sets', config: { score_label: 'Poin', term: 'Set', max_sets: 5, sets_to_win: 3 } },
        { type: 'timer', config: { mode: 'stopwatch' } },
      ],
    }));

    const c2_tunggal_p = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets3.id, name: 'Tunggal Putra', participant_type: 'individual', display_order: 1 }));
    const c2_tunggal_w = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets3.id, name: 'Tunggal Putri', participant_type: 'individual', display_order: 2 }));
    const c2_ganda_p   = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets5.id, name: 'Ganda Putra', participant_type: 'team', display_order: 3 }));
    const c2_campuran  = await client.request(createItem('competition_categories', { event_id: e2.id, format_id: f2_sets3.id, name: 'Ganda Campuran', participant_type: 'team', display_order: 4 }));

    // Tunggal Putra — 12 players, group stage + knockout
    const tp_players = [];
    for (let i = 0; i < 12; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c2_tunggal_p.id, institution_id: i2[i % i2.length], name: generateName(), seed: i < 4 ? i + 1 : null }));
      tp_players.push(p.id);
    }
    // Group stage — 6 matches all finished
    const groupMatchups = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11]];
    for (const [hi, ai] of groupMatchups) {
      const hs = randomInt(17, 21); const as = randomInt(10, hs - 1);
      const m = await client.request(createItem('matches', {
        competition_category_id: c2_tunggal_p.id, status: 'finished', round: 'Fase Grup',
        venue: `Court ${(hi / 2) + 1}`, scheduled_at: offsetHours(-36 + hi),
        home_participant_id: tp_players[hi], away_participant_id: tp_players[ai],
        live_state: LS.setsFinished({
          setsWon: [2, 0], winner: tp_players[hi],
          setLog: [{ label: 'Set 1', home: 21, away: as }, { label: 'Set 2', home: hs, away: randomInt(10, 19) }],
          secs: randomInt(1800, 3600),
        }),
      }));
      denormQueue.push(m.id);
    }
    // QF — 2 finished, 2 live (one of them countdown exhausted)
    const qf_pairs = [[0, 2], [4, 6], [8, 10], [1, 3]];
    for (let i = 0; i < 4; i++) {
      const [hi, ai] = qf_pairs[i];
      const isLive = i === 2;
      const isExhausted = i === 3; // EDGE: countdown at zero
      const hs = randomInt(18, 21); const as = randomInt(15, hs - 1);
      const m = await client.request(createItem('matches', {
        competition_category_id: c2_tunggal_p.id,
        status: isLive || isExhausted ? 'live' : 'finished',
        round: 'Perempat Final', venue: `Court ${i + 1}`,
        scheduled_at: offsetHours(-6 + i),
        home_participant_id: tp_players[hi], away_participant_id: tp_players[ai],
        live_state: isExhausted
          ? LS.countdownExhausted({ homeScore: 0, awayScore: 0 })
          : isLive
            ? LS.setsLive({ setIdx: 1, setScore: [14, 18], setsWon: [1, 0], setLog: [{ label: 'Set 1', home: 21, away: hs }], secs: 1800 })
            : LS.setsFinished({ setsWon: [2, 1], winner: tp_players[hi], setLog: [{ label: 'Set 1', home: 21, away: as }, { label: 'Set 2', home: 18, away: 21 }, { label: 'Set 3', home: hs, away: 15 }], secs: randomInt(2400, 4200) }),
      }));
      denormQueue.push(m.id);
    }
    // SF + Final - upcoming
    for (let i = 0; i < 3; i++) {
      await client.request(createItem('matches', {
        competition_category_id: c2_tunggal_p.id, status: 'upcoming',
        round: i < 2 ? 'Semifinal' : 'Final', match_name: i < 2 ? `SF-${i + 1}` : 'Grand Final',
        venue: 'Main Court', scheduled_at: offsetDays(i < 2 ? 1 : 2),
        home_participant_id: tp_players[i * 2], away_participant_id: tp_players[i * 2 + 1],
      }));
    }

    // Tunggal Putri — 4 players, minimal
    const tw_players = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c2_tunggal_w.id, institution_id: i2[i % i2.length], name: generateName() }));
      tw_players.push(p.id);
    }
    const m_tw_sf = await client.request(createItem('matches', {
      competition_category_id: c2_tunggal_w.id, status: 'finished', round: 'Semifinal',
      venue: 'Court 2', scheduled_at: offsetHours(-12),
      home_participant_id: tw_players[0], away_participant_id: tw_players[1],
      live_state: LS.setsFinished({ setsWon: [2, 0], winner: tw_players[0], setLog: [{ label: 'Set 1', home: 21, away: 14 }, { label: 'Set 2', home: 21, away: 17 }], secs: 2800 }),
    }));
    denormQueue.push(m_tw_sf.id);
    const m_tw_live = await client.request(createItem('matches', {
      competition_category_id: c2_tunggal_w.id, status: 'live', round: 'Semifinal',
      venue: 'Court 3', scheduled_at: offsetHours(-1),
      home_participant_id: tw_players[2], away_participant_id: tw_players[3],
      live_state: LS.setsLive({ setIdx: 0, setScore: [12, 10], setsWon: [0, 0], setLog: [], secs: 900 }),
    }));
    denormQueue.push(m_tw_live.id);
    await client.request(createItem('matches', {
      competition_category_id: c2_tunggal_w.id, status: 'upcoming', round: 'Final',
      match_name: 'Grand Final', venue: 'Main Court', scheduled_at: offsetDays(2),
      home_participant_id: tw_players[0], away_participant_id: tw_players[2],
    }));

    // Ganda Putra — teams
    const gp_teams = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c2_ganda_p.id, institution_id: i2[i % i2.length],
        name: `PB ${UNIVERSITIES[i].name.split(' ')[0]}`,
        members: JSON.stringify([{ name: generateName() }, { name: generateName() }]),
      }));
      gp_teams.push(p.id);
    }
    const m_gp_f = await client.request(createItem('matches', {
      competition_category_id: c2_ganda_p.id, status: 'finished', round: 'Final',
      venue: 'Main Court', scheduled_at: offsetHours(-4),
      home_participant_id: gp_teams[0], away_participant_id: gp_teams[1],
      live_state: LS.setsFinished({ setsWon: [3, 2], winner: gp_teams[0], setLog: [{ label: 'Set 1', home: 21, away: 18 }, { label: 'Set 2', home: 18, away: 21 }, { label: 'Set 3', home: 21, away: 16 }, { label: 'Set 4', home: 17, away: 21 }, { label: 'Set 5', home: 21, away: 19 }], secs: 5400 }),
    }));
    denormQueue.push(m_gp_f.id);

    // Ganda Campuran — teams, upcoming only
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c2_campuran.id, institution_id: i2[i % i2.length],
        name: `Mixed ${UNIVERSITIES[i].name.split(' ')[0]}`,
        members: JSON.stringify([{ name: generateName(), gender: 'M' }, { name: generateName(), gender: 'F' }]),
      }));
    }

    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e2.id, category: 'news', is_published: true,
        published_at: offsetDays(-2), title: 'Rekor Smash 320km/jam Terpecahkan di GOR IPB',
        slug: 'e2-n1',
        excerpt: 'Alat ukur resmi PBSI mencatat kecepatan smash yang belum pernah terlihat di kompetisi kampus.',
        content: 'Suasana GOR Badminton IPB seketika hening saat sebuah smash menghujam sisi lapangan lawan. Bukan hanya karena poin krusialnya, melainkan karena layar display kecepatan menunjukkan angka 320km/jam — rekor baru kompetisi kampus nasional.\n\nTechnical Delegate dari PBSI yang hadir langsung meminta verifikasi ulang alat ukur. Setelah dikonfirmasi dua kali, angka tersebut resmi dicatat sebagai rekor venue.\n\n"Kami memang menduga dia memiliki potensi luar biasa sejak seleksi awal, tapi angka ini benar-benar di luar perkiraan kami," kata pelatihnya.',
      },
      {
        author_id: myId, event_id: e2.id, category: 'update', is_published: true,
        published_at: offsetHours(-5), title: 'Tiket Hari Ketiga Ludes — Layar Tancap Disiapkan',
        slug: 'e2-n2',
        excerpt: 'Kapasitas 1.500 kursi tidak cukup menampung animo suporter.',
        content: 'Seluruh tiket pertandingan hari ketiga IPB Badminton Cup 2026 terjual habis hanya dalam 2 jam setelah sistem ticketing online dibuka. Panitia terpaksa menyiapkan layar tancap berukuran 6x4 meter di pelataran luar GOR.\n\nAntusiasme yang membeludak ini tak lepas dari kualitas pertandingan yang disajikan sejak hari pertama. Beberapa pertandingan grup stage berlangsung hingga rubber set yang menegangkan.',
      },
      {
        author_id: myId, event_id: e2.id, category: 'result', is_published: true,
        published_at: offsetHours(-1), title: 'Hasil Perempat Final: 6 Unggulan Melaju, 2 Sensasi Terjadi',
        slug: 'e2-n3',
        excerpt: 'Dua unggulan tumbang di babak perempat final, membuka peluang bagi kuda hitam.',
        content: 'Babak perempat final IPB Badminton Cup 2026 menorehkan dua kejutan besar. Unggulan ke-3 dan ke-5 harus pulang lebih cepat setelah dikalahkan oleh pemain tak diunggulkan dari PTN luar Jawa.\n\nKekalahan unggulan ke-3 adalah yang paling mengejutkan — ia dikalahkan straight set 21-15, 21-18 dalam waktu kurang dari 40 menit oleh pemain asal Universitas Brawijaya yang baru pertama kali mengikuti turnamen ini.',
      },
    ]));

    // ====================================================================
    // EVENT 3: IPB BERLARI 2026 — MARATHON
    // Formats: finish_time + stopwatch (open, individual & team)
    // Participants: 20 (21K), 20 (10K), 10 (5K), 6 relay teams
    // ====================================================================
    console.log('🏃 [3/6] IPB BERLARI 2026 — Marathon...');
    const e3 = await client.request(createItem('events', {
      user_created: myId,
      name: 'IPB BERLARI 2026',
      slug: 'ipb-berlari-2026',
      type: 'sport',
      status: 'finished',
      is_published: true,
      location: 'Kampus IPB Dramaga — Hutan Penelitian',
      start_date: toDate(offsetDays(-7)),
      end_date: toDate(offsetDays(-7)),
      registration_end_date: offsetDays(-21),
      is_registration_open: false,
      registration_url: 'https://ipb.link/berlari-2026',
      guidebook_url: 'https://ipb.link/berlari-guide',
      instagram_url: 'https://instagram.com/ipberlari',
      website_url: 'https://run.ipb.ac.id',
      description: `IPB BERLARI 2026 adalah perhelatan lari maraton berskala nasional yang mengajak mahasiswa, alumni, dan masyarakat umum untuk merayakan semangat kebugaran di tengah asrinya alam kampus. Menjadi agenda tahunan yang selalu ditunggu, acara ini memadukan olahraga dengan apresiasi terhadap keanekaragaman hayati.

Rute lari dirancang secara khusus untuk menantang sekaligus memanjakan mata, membentang dari jalan aspal berbukit di sekitar rektorat hingga jalur lintasan teduh yang menembus kawasan konservasi Hutan Penelitian Dramaga. Kontur elevasi yang bervariasi menjadikan rute ini ujian yang sempurna, bahkan bagi pelari berpengalaman.

Sejalan dengan visi Green Campus IPB University, event tahun ini mengusung pedoman Zero-Waste secara ketat. Seluruh titik water station diwajibkan memfasilitasi pengisian ulang botol pribadi (tumbler), tanpa ada satupun penggunaan gelas plastik sekali pakai di sepanjang lintasan maupun area festival.`,
    }));

    await client.request(createItems('event_phases',[
      { event_id: e3.id, label: 'Pendaftaran Online', description: 'Pembukaan registrasi umum dengan sistem pembagian tiket secara bertahap (Early Bird, Regular, dan Last Call). Calon peserta wajib mengisi data medis dasar demi menjamin keselamatan selama lomba berlangsung.', date_start: toDate(offsetDays(-30)), time_start: '00:00', status: 'done', display_order: 1 },
      { event_id: e3.id, label: 'Race Pack Pickup', description: 'Sesi pengambilan perlengkapan lomba yang wajib dihadiri peserta. Setiap pelari akan menerima nomor dada (BIB) yang dilengkapi sensor waktu, jersey eksklusif, panduan rute, serta berbagai suvenir sponsor dalam satu tas ramah lingkungan.', date_start: toDate(offsetDays(-9)), time_start: '10:00', status: 'done', display_order: 2 },
      { event_id: e3.id, label: 'Flag Off 21K & 10K', description: 'Momen pelepasan pelari kategori Half-Marathon (21K) dan Challenge (10K) pada pagi buta. Dibuka langsung oleh Rektor IPB University, peserta menempuh rute terpanjang dengan batas waktu (Cut-Off Time) yang diawasi ketat oleh marshall.', date_start: toDate(offsetDays(-7)), time_start: '05:00', status: 'done', display_order: 3 },
      { event_id: e3.id, label: 'Flag Off 5K & Relay', description: 'Pelepasan untuk kategori Fun Run 5K dan estafet (Relay). Fase ini diwarnai oleh suasana yang lebih santai dan meriah, cocok untuk pelari pemula, komunitas kampus, dan peserta yang berlari bersama keluarga.', date_start: toDate(offsetDays(-7)), time_start: '05:30', status: 'done', display_order: 4 },
      { event_id: e3.id, label: 'Awarding Ceremony', description: 'Puncak perayaan yang dihelat di panggung utama. Acara meliputi penyerahan trofi kepada pelari tercepat di setiap kategori podium, pengumuman pemenang kostum terbaik, serta pengundian grand prize (doorprize) yang meriah.', date_start: toDate(offsetDays(-7)), time_start: '09:00', status: 'done', display_order: 5 },
    ]));

    const i3 = await seedInstitutions(e3.id, 8);

    const f3_race = await client.request(createItem('match_formats', {
      event_id: e3.id, name: 'Race — Finish Time ASC',
      match_type: 'open',
      modules: [
        { type: 'finish_time', config: { unit: 's', rank_order: 'asc' } },
        { type: 'timer', config: { mode: 'stopwatch' } },
      ],
    }));
    const f3_relay = await client.request(createItem('match_formats', {
      event_id: e3.id, name: 'Relay Race — Team Finish Time',
      match_type: 'open',
      modules: [
        { type: 'finish_time', config: { unit: 's', rank_order: 'asc' } },
        { type: 'timer', config: { mode: 'stopwatch' } },
        { type: 'notes', config: {} },
      ],
    }));

    const c3_21k  = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_race.id, name: '21K Half Marathon Putra', participant_type: 'individual', display_order: 1 }));
    const c3_21kw = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_race.id, name: '21K Half Marathon Putri', participant_type: 'individual', display_order: 2 }));
    const c3_10k  = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_race.id, name: '10K Challenge', participant_type: 'individual', display_order: 3 }));
    const c3_5k   = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_race.id, name: '5K Fun Run', participant_type: 'individual', display_order: 4 }));
    const c3_relay = await client.request(createItem('competition_categories', { event_id: e3.id, format_id: f3_relay.id, name: 'Relay 4×2.5K Tim', participant_type: 'team', display_order: 5 }));

    // 21K Putra — 20 runners, all finished
    const p3_21k = [];
    for (let i = 0; i < 20; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c3_21k.id, institution_id: i3[i % i3.length], name: generateName() }));
      p3_21k.push({ id: p.id, name: p.name, time: 4800 + randomInt(0, 4800) }); // 1:20 - 2:40 range
    }
    p3_21k.sort((a, b) => a.time - b.time);
    const m3_21k = await client.request(createItem('matches', {
      competition_category_id: c3_21k.id, status: 'finished', venue: 'Start Gate Utama',
      scheduled_at: offsetHours(-7 * 24),
      live_state: LS.timeFinished({
        timeLog: p3_21k.map(r => ({ id: r.id, name: r.name, time: fmtTime(r.time) })),
        rankings: p3_21k.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name })),
        secs: p3_21k.at(-1).time,
      }),
    }));
    await client.request(createItems('match_participants', p3_21k.map((r, i) => ({ match_id: m3_21k.id, participant_id: r.id, position: i + 1 }))));
    denormQueue.push(m3_21k.id);

    // 21K Putri — 10 runners, all finished
    const p3_21kw = [];
    for (let i = 0; i < 10; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c3_21kw.id, institution_id: i3[i % i3.length], name: generateName() }));
      p3_21kw.push({ id: p.id, name: p.name, time: 5400 + randomInt(0, 3600) });
    }
    p3_21kw.sort((a, b) => a.time - b.time);
    const m3_21kw = await client.request(createItem('matches', {
      competition_category_id: c3_21kw.id, status: 'finished', venue: 'Start Gate Utama',
      scheduled_at: offsetHours(-7 * 24),
      live_state: LS.timeFinished({
        timeLog: p3_21kw.map(r => ({ id: r.id, name: r.name, time: fmtTime(r.time) })),
        rankings: p3_21kw.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name })),
        secs: p3_21kw.at(-1).time,
      }),
    }));
    await client.request(createItems('match_participants', p3_21kw.map((r, i) => ({ match_id: m3_21kw.id, participant_id: r.id, position: i + 1 }))));
    denormQueue.push(m3_21kw.id);

    // 10K — 20 runners, finished (timeLog partially empty to test sparse log)
    const p3_10k = [];
    for (let i = 0; i < 20; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c3_10k.id, institution_id: i3[i % i3.length], name: generateName() }));
      p3_10k.push({ id: p.id, name: p.name, time: 2400 + randomInt(0, 1800) });
    }
    p3_10k.sort((a, b) => a.time - b.time);
    const m3_10k = await client.request(createItem('matches', {
      competition_category_id: c3_10k.id, status: 'finished', venue: 'Start Gate Utama',
      scheduled_at: offsetHours(-7 * 24 + 1),
      live_state: LS.timeFinished({
        timeLog: p3_10k.map(r => ({ id: r.id, name: r.name, time: fmtTime(r.time) })),
        rankings: p3_10k.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name })),
        secs: p3_10k.at(-1).time,
      }),
    }));
    await client.request(createItems('match_participants', p3_10k.map((r, i) => ({ match_id: m3_10k.id, participant_id: r.id, position: i + 1 }))));
    denormQueue.push(m3_10k.id);

    // 5K — 10 runners, finished
    const p3_5k = [];
    for (let i = 0; i < 10; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c3_5k.id, institution_id: i3[i % i3.length], name: generateName() }));
      p3_5k.push({ id: p.id, name: p.name, time: 1200 + randomInt(0, 900) });
    }
    p3_5k.sort((a, b) => a.time - b.time);
    const m3_5k = await client.request(createItem('matches', {
      competition_category_id: c3_5k.id, status: 'finished', venue: 'Start Gate Utama',
      scheduled_at: offsetHours(-7 * 24 + 1),
      live_state: LS.timeFinished({
        timeLog: p3_5k.map(r => ({ id: r.id, name: r.name, time: fmtTime(r.time) })),
        rankings: p3_5k.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name })),
        secs: p3_5k.at(-1).time,
      }),
    }));
    await client.request(createItems('match_participants', p3_5k.map((r, i) => ({ match_id: m3_5k.id, participant_id: r.id, position: i + 1 }))));
    denormQueue.push(m3_5k.id);

    // Relay Team — 6 teams, finished
    const p3_relay = [];
    for (let i = 0; i < 6; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c3_relay.id, institution_id: i3[i % i3.length],
        name: `Tim Relay ${UNIVERSITIES[i % i3.length].name.split(' ')[0]}`,
        members: JSON.stringify([{ name: generateName(), leg: 1 }, { name: generateName(), leg: 2 }, { name: generateName(), leg: 3 }, { name: generateName(), leg: 4 }]),
      }));
      p3_relay.push({ id: p.id, name: p.name, time: 1800 + randomInt(0, 600) });
    }
    p3_relay.sort((a, b) => a.time - b.time);
    const m3_relay = await client.request(createItem('matches', {
      competition_category_id: c3_relay.id, status: 'finished', venue: 'Start Gate Utama',
      scheduled_at: offsetHours(-7 * 24 + 1),
      live_state: LS.timeFinished({
        timeLog: p3_relay.map(r => ({ id: r.id, name: r.name, time: fmtTime(r.time) })),
        rankings: p3_relay.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name })),
        secs: p3_relay.at(-1).time,
      }),
    }));
    await client.request(createItems('match_participants', p3_relay.map((r, i) => ({ match_id: m3_relay.id, participant_id: r.id, position: i + 1 }))));
    denormQueue.push(m3_relay.id);

    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e3.id, category: 'result', is_published: true,
        published_at: offsetDays(-7), title: 'IPB Berlari 2026 Sukses Besar — Rekor Lintasan Terpecahkan!',
        slug: 'e3-n1',
        excerpt: 'Event lari tahunan IPB berhasil melampaui target dengan 500+ peserta dan rekor waktu baru di kategori 21K.',
        content: 'IPB Berlari 2026 telah resmi berakhir dan menorehkan kesuksesan besar. Total 547 peserta dari 10 universitas berhasil menyelesaikan seluruh kategori, melampaui target awal 400 peserta.\n\nCapaian paling membanggakan adalah terpecahnya rekor lintasan 21K yang bertahan selama 3 tahun. Trek menantang yang melewati hutan konservasi, jalan aspal berbukit, dan lintasan tanah merah di Sektor 4 kampus berhasil ditaklukkan dalam waktu yang luar biasa.\n\nAcara ditutup dengan Awarding Ceremony yang hangat dan festival kuliner mahasiswa di pelataran GWW.',
      },
      {
        author_id: myId, event_id: e3.id, category: 'news', is_published: true,
        published_at: offsetDays(-7), title: 'Zero-Waste Event: Tidak Satu Pun Sampah Plastik Tertinggal di Lintasan',
        slug: 'e3-n2',
        excerpt: 'Program lingkungan hidup IPB Berlari 2026 mendapat pujian dari Dinas Lingkungan Hidup Kota Bogor.',
        content: 'Sejalan dengan visi Green Campus IPB, panitia IPB Berlari 2026 memberlakukan aturan Zero-Waste secara ketat. Seluruh 12 titik water station menggunakan tumbler yang bisa diisi ulang, melarang sama sekali gelas plastik sekali pakai.\n\nTim Sweeper yang berjalan di belakang peserta terakhir melaporkan: jalur sepanjang 21 kilometer bersih tanpa satupun sampah plastik yang tercecer. Pencapaian ini langsung mendapat apresiasi tertulis dari Dinas Lingkungan Hidup Kota Bogor dan dijadikan contoh best practice untuk penyelenggara event outdoor lainnya.',
      },
    ]));

    // ====================================================================
    // EVENT 4: IT-TODAY HACKTODAY 2026 — HACKATHON
    // Formats: manual_pick + timer (open, team)
    // Participants: 10 tim per kategori, 3 kategori
    // ====================================================================
    console.log('💻 [4/6] IT-TODAY HACKTODAY 2026 — Hackathon...');
    const e4 = await client.request(createItem('events', {
      user_created: myId,
      name: 'IT-TODAY HACKTODAY 2026',
      slug: 'hacktoday-2026',
      type: 'sport', 
      status: 'finished',
      is_published: true,
      location: 'Auditorium AHN, Kampus IPB Dramaga',
      start_date: toDate(offsetDays(-4)),
      end_date: toDate(offsetDays(-3)),
      registration_end_date: offsetDays(-25),
      is_registration_open: false,
      registration_url: 'https://ipb.link/hacktoday-2026',
      guidebook_url: 'https://ipb.link/hacktoday-guide',
      instagram_url: 'https://instagram.com/ittodayipb',
      website_url: 'https://ittoday.ipb.ac.id',
      description: `IT-TODAY HACKTODAY 2026 adalah puncak kompetisi teknologi flagship milik IPB University yang mempertemukan developer, desainer, dan inovator muda berbakat dari berbagai universitas di Indonesia. Mengusung tema besar 'Digital Agriculture 4.0 — Feeding the Future', para peserta dituntut untuk merumuskan ide brilian dan mengubahnya menjadi produk digital yang fungsional.

Peserta akan dikarantina dan ditantang untuk membangun solusi berbasis teknologi tingkat tinggi seperti kecerdasan buatan (AI), Internet of Things (IoT), dan teknologi Web3 dalam batas waktu 24 jam non-stop. Solusi yang dirancang harus menyasar secara langsung pada masalah-masalah riil di sektor ketahanan pangan, pertanian presisi, dan rantai pasok agrikultur nasional.

Kompetisi ini lebih dari sekadar ajang unjuk kecepatan coding. Hacktoday 2026 adalah inkubator inovasi, di mana prototipe terbaik akan dievaluasi langsung oleh panel juri yang terdiri dari akademisi senior, pemodal ventura, dan praktisi industri teknologi terkemuka yang siap mendukung pendanaan tahap awal.`,
    }));

    await client.request(createItems('event_phases',[
      { event_id: e4.id, label: 'Opening Ceremony', description: 'Acara kick-off resmi untuk membuka 24 jam hackathon. Panitia akan mengumumkan dataset rahasia yang baru dirilis, memaparkan rincian rubrik penilaian juri, serta menyelenggarakan sesi pengarahan dari sponsor utama kegiatan.', date_start: toDate(offsetDays(-4)), time_start: '09:00', status: 'done', display_order: 1 },
      { event_id: e4.id, label: 'Hacking Phase', description: 'Fase inti yang menguji ketahanan mental dan fisik; seluruh tim dikarantina di dalam auditorium untuk menerjemahkan ide ke dalam baris kode. Selama fase ini, panitia menyediakan makanan, area istirahat, serta sesi konsultasi eksklusif bersama mentor industri.', date_start: toDate(offsetDays(-4)), time_start: '10:00', status: 'done', display_order: 2 },
      { event_id: e4.id, label: 'Code Freeze', description: 'Waktu mutlak di mana segala aktivitas modifikasi kode sumber (commit) wajib dihentikan. Akses repositori sistem akan ditutup dan para tim diberi waktu singkat untuk menyempurnakan slide presentasi (pitch deck) mereka.', date_start: toDate(offsetDays(-3)), time_start: '10:00', status: 'done', display_order: 3 },
      { event_id: e4.id, label: 'Pitching & Judging', description: 'Sesi presentasi akhir di hadapan panel juri. Setiap tim diberikan waktu 5 menit untuk melakukan live-demo aplikasi mereka, dilanjutkan dengan sesi tanya jawab (Q&A) teknis dan bisnis yang kritis untuk menguji validitas ide.', date_start: toDate(offsetDays(-3)), time_start: '13:00', status: 'done', display_order: 4 },
      { event_id: e4.id, label: 'Awarding & Closing', description: 'Pengumuman karya-karya pemenang untuk seluruh kategori kompetisi, penyerahan hadiah secara simbolis senilai puluhan juta rupiah, dan acara networking santai yang mempertemukan peserta dengan perwakilan perusahaan perekrut.', date_start: toDate(offsetDays(-3)), time_start: '17:00', status: 'done', display_order: 5 },
    ]));

    const i4 = await seedInstitutions(e4.id, 8);

    const f4_hack = await client.request(createItem('match_formats', {
      event_id: e4.id, name: 'Hackathon — Manual Jury Pick Top 3',
      match_type: 'open',
      modules:[
        { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
        { type: 'timer', config: { mode: 'deadline' } },
        { type: 'notes', config: {} },
      ],
    }));
    const f4_ctf = await client.request(createItem('match_formats', {
      event_id: e4.id, name: 'CTF — Automated Scoring',
      match_type: 'open',
      modules: [
        { type: 'manual_pick', config: { allow_draw: false, top_n: 5, ranked_order: true } },
        { type: 'timer', config: { mode: 'countdown', duration: 86400 } },
      ],
    }));

    const c4_web3  = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_hack.id, name: 'Web3 × DeFi', participant_type: 'team', display_order: 1 }));
    const c4_ai    = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_hack.id, name: 'AI × AgriTech', participant_type: 'team', display_order: 2 }));
    const c4_iot   = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_hack.id, name: 'IoT × Smart Farm', participant_type: 'team', display_order: 3 }));
    const c4_cyber = await client.request(createItem('competition_categories', { event_id: e4.id, format_id: f4_ctf.id, name: 'Cybersecurity CTF', participant_type: 'team', display_order: 4 }));

    const genHackTeams = async (catId, count = 10) => {
      const teams = [];
      const prefixes = ['Team', 'Squad', 'Crew', 'Lab', 'Project', 'Studio', 'Dev', 'Tech', 'Code', 'Hack'];
      const suffixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Nova', 'Apex', 'Zero', 'Prime', 'Nexus'];
      for (let i = 0; i < count; i++) {
        const p = await client.request(createItem('participants', {
          competition_category_id: catId, institution_id: i4[i % i4.length],
          name: `${prefixes[i % prefixes.length]} ${suffixes[i % suffixes.length]}`,
          members: JSON.stringify([
            { name: generateName(), role: 'Frontend' },
            { name: generateName(), role: 'Backend' },
            { name: generateName(), role: 'ML Engineer' },
          ]),
          notes: `Proposal: ${['Smart irrigation', 'Crop disease AI', 'Supply chain DeFi', 'Soil sensor mesh', 'Livestock tracking', 'Carbon credit NFT', 'Weather prediction', 'Pest detection CV', 'Yield forecast', 'Cold chain monitor'][i]}`,
        }));
        teams.push({ id: p.id, name: p.name });
      }
      return teams;
    };

    // Web3 — all finished, top 3 declared
    const p4_web3 = await genHackTeams(c4_web3.id);
    const m4_web3 = await client.request(createItem('matches', {
      competition_category_id: c4_web3.id, status: 'finished', venue: 'Ruang Sidang A',
      scheduled_at: offsetHours(-4 * 24 + 14),
      live_state: LS.pickFinished({ rankings: [
        { rank: 1, id: p4_web3[0].id, name: p4_web3[0].name },
        { rank: 2, id: p4_web3[4].id, name: p4_web3[4].name },
        { rank: 3, id: p4_web3[7].id, name: p4_web3[7].name },
      ]}),
    }));
    await client.request(createItems('match_participants', p4_web3.map((p, i) => ({ match_id: m4_web3.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m4_web3.id);

    // AI AgriTech — finished, partial (only top 2 ranked, 3rd not declared)
    const p4_ai = await genHackTeams(c4_ai.id);
    const m4_ai = await client.request(createItem('matches', {
      competition_category_id: c4_ai.id, status: 'finished', venue: 'Auditorium AHN',
      scheduled_at: offsetHours(-4 * 24 + 16),
      live_state: LS.pickFinished({ rankings: [
        { rank: 1, id: p4_ai[2].id, name: p4_ai[2].name },
        { rank: 2, id: p4_ai[5].id, name: p4_ai[5].name },
        { rank: 3, id: p4_ai[9].id, name: p4_ai[9].name },
      ]}),
    }));
    await client.request(createItems('match_participants', p4_ai.map((p, i) => ({ match_id: m4_ai.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m4_ai.id);

    // IoT — finished
    const p4_iot = await genHackTeams(c4_iot.id, 8);
    const m4_iot = await client.request(createItem('matches', {
      competition_category_id: c4_iot.id, status: 'live', venue: 'Ruang Sidang B', // Changed to LIVE
      scheduled_at: offsetHours(-4),
      live_state: LS.deadlineLive({ targetHours: 12 }), // Now has a real ticking deadline
    }));
    await client.request(createItems('match_participants', p4_iot.map((p, i) => ({ match_id: m4_iot.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m4_iot.id);

    // CTF — finished, top 5
    const p4_ctf = await genHackTeams(c4_cyber.id, 12);
    const m4_ctf = await client.request(createItem('matches', {
      competition_category_id: c4_cyber.id, status: 'finished', venue: 'Lab Komputer 1',
      scheduled_at: offsetHours(-4 * 24 + 10),
      live_state: LS.pickFinished({ rankings: [
        { rank: 1, id: p4_ctf[1].id, name: p4_ctf[1].name },
        { rank: 2, id: p4_ctf[5].id, name: p4_ctf[5].name },
        { rank: 3, id: p4_ctf[0].id, name: p4_ctf[0].name },
        { rank: 4, id: p4_ctf[8].id, name: p4_ctf[8].name },
        { rank: 5, id: p4_ctf[11].id, name: p4_ctf[11].name },
      ]}),
    }));
    await client.request(createItems('match_participants', p4_ctf.map((p, i) => ({ match_id: m4_ctf.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m4_ctf.id);

    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e4.id, category: 'announcement', is_published: true,
        published_at: offsetDays(-5), title: 'IT-TODAY Hacktoday 2026 Dimulai — Tema "Digital Agriculture 4.0" Diumumkan',
        slug: 'e4-n1',
        excerpt: 'Lebih dari 40 tim developer terbaik Indonesia berkumpul untuk 24 jam coding marathon.',
        content: 'IT-TODAY HACKTODAY 2026 resmi dimulai hari ini di Auditorium AHN, Kampus IPB Dramaga. Ketua Panitia mengumumkan tema besar tahun ini: "Digital Agriculture 4.0 — Feeding the Future". Tema ini mengajak para developer untuk membangun solusi berbasis AI, IoT, Web3, dan Cybersecurity yang secara langsung menjawab tantangan ketahanan pangan nasional.\n\nTotal 42 tim dari 8 universitas telah lolos tahap seleksi administratif. Setiap tim diberi akses ke dataset eksklusif milik Institut Pertanian Bogor berupa data hasil panen, kondisi cuaca historis, dan data tanah dari 15 lokasi penelitian.\n\n"Kami ingin solusi yang bisa langsung diimplementasikan, bukan sekadar prototype cantik," tegas Direktur Kemahasiswaan IPB.',
      },
      {
        author_id: myId, event_id: e4.id, category: 'news', is_published: true,
        published_at: offsetDays(-4), title: 'H-6 Jam Coding Phase: Ketegangan Merambat ke Setiap Sudut Ruangan',
        slug: 'e4-n2',
        excerpt: 'Para peserta berlomba dengan waktu untuk men-deploy solusi mereka.',
        content: 'Memasuki jam ke-18 dari 24 jam yang diberikan, suasana di Auditorium AHN terasa semakin intens. Aroma kopi pekat bercampur dengan bunyi keyboard mekanikal yang tanpa henti mendominasi ruangan.\n\nPantauan panitia menunjukkan sebagian besar tim unggulan kini berada di fase kritis: integrasi model ML ke dalam antarmuka pengguna. Beberapa tim terlihat mendapat dukungan teknis langsung dari mentor industri yang berjaga secara bergilir sepanjang malam.\n\n"Kami hampir selesai dengan model deteksi hama berbasis computer vision, tapi latency-nya masih terlalu tinggi untuk deployment mobile," ujar kapten salah satu tim asal Bandung.',
      },
      {
        author_id: myId, event_id: e4.id, category: 'result', is_published: true,
        published_at: offsetDays(-3), title: 'Selamat Para Pemenang IT-TODAY HACKTODAY 2026!',
        slug: 'e4-n3',
        excerpt: 'Empat kategori telah diputuskan. Total hadiah 100 juta rupiah dibagikan kepada para juara.',
        content: 'Panel juri yang terdiri dari perwakilan perusahaan teknologi terkemuka telah menyelesaikan sesi penilaian. Keputusan akhir diumumkan dalam suasana yang penuh ketegangan.\n\nDi kategori AI × AgriTech, solusi peringkat pertama berhasil memenangkan persaingan ketat berkat pendekatan inovatif menggabungkan large language model dengan data sensor lapangan untuk memberikan rekomendasi pemupukan yang presisi. Di kategori IoT, solusi smart greenhouse yang dapat beradaptasi otomatis terhadap kondisi cuaca ekstrem menjadi favorit juri.\n\nTotal hadiah senilai 100 juta rupiah telah diserahkan langsung oleh Rektor IPB University dalam Awarding Ceremony yang meriah.',
      },
    ]));

    // ====================================================================
    // EVENT 5: IPB FUTSAL CUP 2026
    // Status: upcoming (registration open) — tests countdown timer frontend
    // Formats: score_timed + countdown + periods
    // Participants: 8 tim, grup stage sepenuhnya upcoming
    // ====================================================================
    console.log('⚽ [5/6] IPB FUTSAL CUP 2026 — Upcoming with open registration...');
    const e5 = await client.request(createItem('events', {
      user_created: myId,
      name: 'IPB FUTSAL CUP 2026',
      slug: 'ipb-futsal-2026',
      type: 'sport',
      status: 'upcoming',
      is_published: true,
      location: 'GOR Futsal IPB, Dramaga',
      start_date: toDate(offsetDays(18)),
      end_date: toDate(offsetDays(28)),
      registration_end_date: offsetDays(10),
      is_registration_open: true,
      registration_url: 'https://ipb.link/futsal-2026',
      guidebook_url: 'https://ipb.link/futsal-guide',
      instagram_url: 'https://instagram.com/ipbfutsalcup',
      website_url: 'https://futsal.ipb.ac.id',
      description: `IPB Futsal Cup 2026 adalah turnamen futsal mahasiswa paling bergengsi di wilayah Bogor dan sekitarnya, yang selalu menjadi pusat animo terbesar setiap tahunnya. Dengan kategori putra dan putri, kompetisi ini dirancang untuk mewadahi minat, bakat, serta menumbuhkan jiwa kepemimpinan di lapangan hijau.

Selama 11 hari penuh, GOR Futsal IPB akan menjadi arena pertempuran sengit bagi puluhan tim perwakilan fakultas dan universitas undangan, memperebutkan supremasi tertinggi serta piala rektor. Format pertandingan dibagi menjadi fase grup yang penuh kalkulasi poin, berlanjut ke sistem gugur yang menegangkan.

Kekuatan utama dari turnamen ini bukan hanya pada kualitas taktik dan skill atlet, melainkan juga pada euforia dan kreativitas dari ribuan suporter di tribun. Kolaborasi antara pertandingan intens di lapangan dan gemuruh nyanyian (chants) suporter menciptakan sebuah festival olahraga yang benar-benar epik.`,
    }));

    await client.request(createItems('event_phases',[
      { event_id: e5.id, label: 'Registrasi Online', description: 'Periode penerimaan berkas pendaftaran bagi tim yang berminat. Karena kuota partisipan sangat dibatasi untuk menjaga kualitas turnamen, panitia menerapkan proses verifikasi dokumen administrasi secara ketat dan cepat.', date_start: toDate(offsetDays(-14)), time_start: '00:00', status: 'current', display_order: 1 },
      { event_id: e5.id, label: 'Technical Meeting', description: 'Forum krusial pra-turnamen di mana panitia akan memandu proses drawing grup, mengesahkan roster pemain resmi, dan menetapkan aturan disiplin turnamen, termasuk regulasi ketat terkait perilaku suporter di tribun.', date_start: toDate(offsetDays(15)), time_start: '15:00', status: 'upcoming', display_order: 2 },
      { event_id: e5.id, label: 'Fase Grup', description: 'Rangkaian pertandingan awal dengan sistem setengah kompetisi. Setiap tim bertarung untuk mengumpulkan poin tertinggi di grupnya masing-masing. Hanya juara dan runner-up grup yang berhak mengamankan tiket ke babak selanjutnya.', date_start: toDate(offsetDays(18)), time_start: '08:00', status: 'upcoming', display_order: 3 },
      { event_id: e5.id, label: 'Fase Knockout', description: 'Babak penentuan mutlak yang dimulai dari perempat final hingga semifinal. Tidak ada ruang untuk kesalahan dalam fase ini; kekalahan berarti harus mengepak koper dan mengubur mimpi mengangkat trofi juara.', date_start: toDate(offsetDays(25)), time_start: '09:00', status: 'upcoming', display_order: 4 },
      { event_id: e5.id, label: 'Grand Final & Awarding', description: 'Laga pamungkas turnamen dengan atmosfer paling meriah. Menampilkan perebutan juara 3 dan partai final yang menentukan penguasa futsal kampus tahun ini, ditutup dengan selebrasi pengangkatan trofi, gelar pemain terbaik, dan top skor.', date_start: toDate(offsetDays(28)), time_start: '15:00', status: 'upcoming', display_order: 5 },
    ]));

    const i5 = await seedInstitutions(e5.id, 8);

    const f5_futsal = await client.request(createItem('match_formats', {
      event_id: e5.id, name: 'Futsal — 2×20 Menit',
      match_type: 'head_to_head',
      modules: [
        { type: 'score_timed', config: { score_label: 'Gol', has_periods: true, period_count: 2, period_term: 'Babak' } },
        { type: 'timer', config: { mode: 'countdown', duration: 1200 } },
        { type: 'notes', config: {} },
      ],
    }));
    const f5_penalty = await client.request(createItem('match_formats', {
      event_id: e5.id, name: 'Futsal — Adu Penalti',
      match_type: 'head_to_head',
      modules: [
        { type: 'manual_pick', config: { allow_draw: false, top_n: 1, ranked_order: false } },
        { type: 'notes', config: {} },
      ],
    }));

    const c5_beregu = await client.request(createItem('competition_categories', { event_id: e5.id, format_id: f5_futsal.id, name: 'Beregu Putra', participant_type: 'team', display_order: 1 }));
    const c5_putri  = await client.request(createItem('competition_categories', { event_id: e5.id, format_id: f5_futsal.id, name: 'Beregu Putri', participant_type: 'team', display_order: 2 }));

    const futsalTeamNames = ['FC Dramaga', 'Bogor United', 'IPB Striker', 'Agricola FC', 'Bima Sakti', 'Green Eagle', 'Kampus Stars', 'Tiger Squad'];
    const futsal_teams_p = [];
    for (let i = 0; i < 8; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c5_beregu.id, institution_id: i5[i % i5.length],
        name: futsalTeamNames[i],
        members: JSON.stringify(Array.from({ length: 10 }, (_, j) => ({ name: generateName(), jersey: j + 1, position: j === 0 ? 'GK' : 'Player' }))),
      }));
      futsal_teams_p.push(p.id);
    }
    // Group A: 4 teams, Group B: 4 teams — all upcoming
    const groupA = futsal_teams_p.slice(0, 4);
    const groupB = futsal_teams_p.slice(4, 8);
    const groupMatchupsFutsal = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
    for (const [hi, ai] of groupMatchupsFutsal) {
      const dayOffset = 18 + Math.floor(groupMatchupsFutsal.indexOf([hi, ai]) / 3);
      await client.request(createItem('matches', {
        competition_category_id: c5_beregu.id, status: 'upcoming', round: 'Fase Grup A',
        venue: 'GOR Futsal IPB', scheduled_at: offsetDays(18 + (groupMatchupsFutsal.indexOf([hi,ai]) % 3)),
        home_participant_id: groupA[hi], away_participant_id: groupA[ai],
        live_state: LS.upcoming(),
      }));
    }
    for (const [hi, ai] of groupMatchupsFutsal) {
      await client.request(createItem('matches', {
        competition_category_id: c5_beregu.id, status: 'upcoming', round: 'Fase Grup B',
        venue: 'GOR Futsal IPB', scheduled_at: offsetDays(18 + (groupMatchupsFutsal.indexOf([hi,ai]) % 3) + 0.5),
        home_participant_id: groupB[hi], away_participant_id: groupB[ai],
        live_state: LS.upcoming(),
      }));
    }
    // Knockout placeholders (TBD participants)
    for (let round = 0; round < 3; round++) {
      const roundName = ['Perempat Final', 'Semifinal', 'Final'][round];
      const matchCount = [4, 2, 1][round];
      for (let i = 0; i < matchCount; i++) {
        await client.request(createItem('matches', {
          competition_category_id: c5_beregu.id, status: 'upcoming',
          round: roundName, match_name: `${roundName} ${i + 1}`,
          venue: 'GOR Futsal IPB', scheduled_at: offsetDays(25 + round),
          live_state: LS.upcoming(),
          // home/away intentionally null — participants TBD
        }));
      }
    }

    // Putri — 4 teams, upcoming
    for (let i = 0; i < 4; i++) {
      await client.request(createItem('participants', {
        competition_category_id: c5_putri.id, institution_id: i5[i % i5.length],
        name: `${futsalTeamNames[i]} Putri`,
        members: JSON.stringify(Array.from({ length: 8 }, () => ({ name: generateName() }))),
      }));
    }

    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e5.id, category: 'announcement', is_published: true,
        published_at: offsetDays(-3), title: 'Registrasi IPB Futsal Cup 2026 Dibuka — Kuota Terbatas!',
        slug: 'e5-n1',
        excerpt: 'Pendaftaran resmi dibuka hari ini. Daftarkan tim kamu sebelum kuota habis.',
        content: 'Panitia IPB Futsal Cup 2026 resmi membuka pendaftaran peserta mulai hari ini. Kuota peserta dibatasi hanya 16 tim untuk kategori Putra dan 8 tim untuk kategori Putri demi menjaga kualitas pertandingan.\n\nPendaftaran dilakukan secara online melalui portal resmi dengan melampirkan daftar pemain (maks. 12 orang termasuk kiper), kartu mahasiswa aktif seluruh anggota, dan bukti transfer biaya pendaftaran.\n\nBerdasarkan pengalaman tahun lalu, kuota penuh dalam waktu kurang dari 2 minggu. Jangan sampai ketinggalan!',
      },
      {
        author_id: myId, event_id: e5.id, category: 'news', is_published: true,
        published_at: offsetDays(-1), title: 'Drawing Grup: Grup A Jadi Neraka, Grup B Lebih Terbuka',
        slug: 'e5-n2',
        excerpt: 'Hasil drawing menempatkan 3 tim unggulan di Grup A, membuat Grup B tampak lebih terbuka bagi kuda hitam.',
        content: 'Drawing fase grup IPB Futsal Cup 2026 yang digelar kemarin sore menghasilkan komposisi grup yang sangat menarik. Grup A dihuni oleh tiga tim yang menjadi unggulan utama berdasarkan performa musim lalu, menjadikannya grup paling kompetitif dan sulit diprediksi.\n\nSementara Grup B tampak lebih terbuka, namun jangan meremehkan tim-tim di sini. Tahun lalu, juaranya justru berasal dari posisi runner-up di grup yang dianggap lebih mudah.\n\nTechnical Meeting akan diselenggarakan H-3 sebelum turnamen dimulai untuk konfirmasi skuad final dan sosialisasi peraturan terbaru.',
      },
    ]));

    // ====================================================================
    // EVENT 6: IPB ART FESTIVAL 2026
    // Formats: judge_scores+notes (vocal solo), judge_scores (dance), finish_time (writing), manual_pick (visual art)
    // Participants: 15 vokal, 10 dance, 8 writing, 8 visual art
    // Status: active, is_published, all phases
    // ====================================================================
    console.log('🎤 [6/6] IPB ART FESTIVAL 2026 — Arts...');
    const e6 = await client.request(createItem('events', {
      user_created: myId,
      name: 'IPB ART FESTIVAL 2026',
      slug: 'ipb-art-fest-2026',
      type: 'arts',
      status: 'active',
      is_published: true,
      location: 'Gedung Graha Widya Wisuda (GWW), IPB',
      start_date: toDate(offsetDays(-2)),
      end_date: toDate(offsetDays(2)),
      registration_end_date: offsetDays(-30),
      is_registration_open: false,
      registration_url: 'https://ipb.link/artfest-2026',
      guidebook_url: 'https://ipb.link/artfest-guide',
      instagram_url: 'https://instagram.com/ipbartfest',
      website_url: 'https://art.ipb.ac.id',
      description: `IPB Art Festival 2026 merupakan selebrasi akbar seni dan budaya yang mewadahi ragam ekspresi kreatif mahasiswa dari berbagai universitas terkemuka di Indonesia. Festival ini menegaskan komitmen kampus dalam mencetak generasi intelektual yang tidak hanya unggul secara akademis, namun juga memiliki sensitivitas dan apresiasi tinggi terhadap nilai estetika.

Mulai dari seni pertunjukan yang memukau seperti vokal solo dan kompetisi tari, hingga karya cipta yang mendalam berupa pameran seni rupa digital dan simposium karya tulis ilmiah, seluruh agenda dirancang untuk mentransformasi gedung kampus menjadi pusat kebudayaan kontemporer yang inklusif.

Tahun ini, gedung utama Graha Widya Wisuda (GWW) disulap layaknya gedung konser profesional bertaraf internasional. Berbekal tata cahaya dinamis dan sistem suara termutakhir, panitia berdedikasi memberikan panggung megah bagi para seniman muda agar dapat mempersembahkan karya terbaik mereka kepada khalayak luas.`,
    }));

    await client.request(createItems('event_phases',[
      { event_id: e6.id, label: 'Audisi Online', description: 'Tahap penyaringan awal secara daring di mana seluruh pendaftar kategori seni pertunjukan wajib mengunggah video penampilan orisinal mereka. Kurator ahli akan menilai bakat dasar dan potensi panggung dari setiap kandidat.', date_start: toDate(offsetDays(-30)), time_start: '00:00', status: 'done', display_order: 1 },
      { event_id: e6.id, label: 'Pengumuman Lolos Audisi', description: 'Publikasi daftar resmi berisi 50 peserta atau tim yang berhak melaju ke panggung utama (Live Show). Peserta terpilih juga akan mendapatkan jadwal pembekalan teknis panggung dan arahan logistik dari panitia pelaksana.', date_start: toDate(offsetDays(-14)), time_start: '12:00', status: 'done', display_order: 2 },
      { event_id: e6.id, label: 'Hari 1 — Karya Tulis & Seni Rupa', description: 'Pembukaan resmi festival yang difokuskan pada presentasi mendalam karya tulis ilmiah (KTI) serta peresmian pameran galeri Seni Rupa Digital. Pengunjung dapat berinteraksi langsung dengan kreator di area exhibition hall.', date_start: toDate(offsetDays(-2)), time_start: '09:00', status: 'done', display_order: 3 },
      { event_id: e6.id, label: 'Hari 2 — Tari & Vokal (Top 10)', description: 'Malam pertunjukan fase penyisihan live, menampilkan aksi 10 peserta terbaik dari kategori tari tradisional, tari modern, dan vokal solo. Panggung mulai memanas saat dewan juri melakukan kurasi ketat untuk menentukan finalis.', date_start: toDate(offsetDays(-1)), time_start: '19:00', status: 'done', display_order: 4 },
      { event_id: e6.id, label: 'Hari 3 — Grand Finale Vokal & Tari', description: 'Malam puncak kompetisi pertunjukan seni. Para finalis terpilih akan memberikan penampilan pamungkas (all-out) yang dipadukan dengan aransemen live orkestra dan efek visual panggung tingkat tinggi untuk mengunci penilaian juri.', date_start: toDate(offsetDays(0)), time_start: '19:00', status: 'current', display_order: 5 },
      { event_id: e6.id, label: 'Malam Awarding', description: 'Gala penutup rangkaian festival. Agenda utamanya adalah pengumuman juara umum dari seluruh kategori seni, penyematan medali, dan konser penutup (guest star performance) untuk merayakan keberhasilan bersama.', date_start: toDate(offsetDays(2)), time_start: '19:00', status: 'upcoming', display_order: 6 },
    ]));

    const i6 = await seedInstitutions(e6.id, 8);

    const f6_vocal = await client.request(createItem('match_formats', {
      event_id: e6.id, name: 'Vocal Solo — 3 Juri (Avg)',
      match_type: 'solo',
      modules: [
        { type: 'judge_scores', config: { num_judges: 3, method: 'avg', score_min: 0, score_max: 100, step: 1 } },
        { type: 'notes', config: {} },
      ],
    }));
    const f6_dance = await client.request(createItem('match_formats', {
      event_id: e6.id, name: 'Tari — 5 Juri (Drop Extremes)',
      match_type: 'solo',
      modules: [
        { type: 'judge_scores', config: { num_judges: 5, method: 'drop_extremes', score_min: 0, score_max: 100, step: 0.5 } },
        { type: 'timer', config: { mode: 'stopwatch' } },
        { type: 'notes', config: {} },
      ],
    }));
    const f6_write = await client.request(createItem('match_formats', {
      event_id: e6.id, name: 'Karya Tulis — Submission Time',
      match_type: 'open',
      modules: [
        { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
        { type: 'notes', config: {} },
      ],
    }));
    const f6_visual = await client.request(createItem('match_formats', {
      event_id: e6.id, name: 'Seni Rupa — Panel Juri',
      match_type: 'open',
      modules:[
        { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
        { type: 'timer', config: { mode: 'deadline' } }, 
      ],
    }));

    const c6_vocal  = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_vocal.id, name: 'Vocal Solo Pop', participant_type: 'individual', display_order: 1 }));
    const c6_vocalj = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_vocal.id, name: 'Vocal Solo Jazz', participant_type: 'individual', display_order: 2 }));
    const c6_dance  = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_dance.id, name: 'Tari Tradisional', participant_type: 'individual', display_order: 3 }));
    const c6_dancem = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_dance.id, name: 'Tari Modern (Tim)', participant_type: 'team', display_order: 4 }));
    const c6_write  = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_write.id, name: 'Karya Tulis Ilmiah', participant_type: 'individual', display_order: 5 }));
    const c6_visual = await client.request(createItem('competition_categories', { event_id: e6.id, format_id: f6_visual.id, name: 'Seni Rupa Digital', participant_type: 'individual', display_order: 6 }));

    // -- Vocal Solo Pop — 15 performers, staggered schedule --
    // Round 1 (10 performers): 8 finished, 1 live, 1 upcoming
    // Round 2 (5 performers): all upcoming
    const vocalNotes = [
      'Teknik pernapasan sangat terkontrol. Dinamika lagu terjaga dari awal hingga akhir.',
      'Falsetto yang bersih dan natural. Penghayatan lirik terasa tulus dan mengena.',
      'Resonansi chest voice kuat. Namun intonasi pada bridge sedikit goyah.',
      'Penampilan yang percaya diri. Ekspresi panggung sangat memikat.',
      'Teknik vibrato terkontrol dengan baik. Klimaks lagu dieksekusi sempurna.',
      'Vokal jernih dan stabil. Mampu membawa seluruh penonton ke dalam cerita lagu.',
      'Pilihan lagu sesuai register vokal. Penyelesaian nada tinggi sangat memukau.',
      'Gestur panggung natural. Kekuatan vokal pada refrain terasa konsisten.',
    ];
    const vocalPop = [];
    for (let i = 0; i < 15; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c6_vocal.id, institution_id: i6[i % i6.length], name: generateName() }));
      vocalPop.push(p.id);
    }
    for (let i = 0; i < 15; i++) {
      const isR1 = i < 10;
      const isFinished = i < 8;
      const isLive = i === 8;
      const scores = [randomInt(78, 96), randomInt(78, 96), randomInt(78, 96)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c6_vocal.id,
        status: isFinished ? 'finished' : isLive ? 'live' : 'upcoming',
        round: isR1 ? 'Top 10' : 'Grand Final Top 5',
        match_name: `Performance #${i + 1}`,
        venue: 'GWW Main Stage',
        scheduled_at: offsetHours(-10 + i * 1.2),
        home_participant_id: vocalPop[i],
        live_state: isFinished
          ? LS.judgeFinished({ scores, notes: vocalNotes[i % vocalNotes.length] })
          : isLive
            ? LS.judgeLive({ scores: [scores[0], null, null], notes: 'Sedang bernyanyi di atas panggung...' })
            : LS.upcoming(),
      }));
      if (isFinished || isLive) denormQueue.push(m.id);
    }

    // -- Vocal Solo Jazz — 6 performers, all finished --
    for (let i = 0; i < 6; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c6_vocalj.id, institution_id: i6[i % i6.length], name: generateName() }));
      const scores = [randomInt(72, 94), randomInt(72, 94), randomInt(72, 94)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c6_vocalj.id, status: 'finished', round: 'Final',
        venue: 'GWW Black Box Theater', scheduled_at: offsetHours(-18 + i * 2),
        home_participant_id: p.id,
        live_state: LS.judgeFinished({ scores, notes: 'Improvisasi jazz yang orisinal dan berani.' }),
      }));
      denormQueue.push(m.id);
    }

    // -- Tari Tradisional — 10 performers, mix --
    const dancePerformers = [];
    for (let i = 0; i < 10; i++) {
      const p = await client.request(createItem('participants', { competition_category_id: c6_dance.id, institution_id: i6[i % i6.length], name: generateName() }));
      dancePerformers.push(p.id);
    }
    for (let i = 0; i < 10; i++) {
      const isLive = i === 5;
      const isUpcoming = i > 5;
      const scores5 = [randomFloat(75, 97, 0.5), randomFloat(75, 97, 0.5), randomFloat(75, 97, 0.5), randomFloat(75, 97, 0.5), randomFloat(75, 97, 0.5)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c6_dance.id,
        status: isUpcoming ? 'upcoming' : isLive ? 'live' : 'finished',
        round: 'Top 10', venue: 'GWW Auditorium', scheduled_at: offsetHours(-8 + i * 1.5),
        home_participant_id: dancePerformers[i],
        live_state: isUpcoming ? LS.upcoming() : isLive
          ? LS.judgeLive({ scores: [scores5[0], scores5[1], null, null, null], notes: 'Gerakan dasar tari Saman yang presisi.' })
          : LS.judgeFinished({ scores: scores5, notes: 'Keanggunan gerak tari yang memukau.' }),
      }));
      if (!isUpcoming) denormQueue.push(m.id);
    }

    // -- Tari Modern Tim — 4 teams, all finished --
    const danceTeams = [];
    for (let i = 0; i < 4; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c6_dancem.id, institution_id: i6[i % i6.length],
        name: `Dance Crew ${UNIVERSITIES[i].name.split(' ')[0]}`,
        members: JSON.stringify(Array.from({ length: randomInt(5, 8) }, () => ({ name: generateName() }))),
      }));
      danceTeams.push(p.id);
    }
    for (const tid of danceTeams) {
      const scores5 = [randomFloat(80, 98, 0.5), randomFloat(80, 98, 0.5), randomFloat(80, 98, 0.5), randomFloat(80, 98, 0.5), randomFloat(80, 98, 0.5)];
      const m = await client.request(createItem('matches', {
        competition_category_id: c6_dancem.id, status: 'finished', round: 'Final',
        venue: 'GWW Main Stage', scheduled_at: offsetHours(-20),
        home_participant_id: tid,
        live_state: LS.judgeFinished({ scores: scores5, notes: 'Koreografi penuh energi dengan sinkronisasi anggota tim yang sangat tinggi.' }),
      }));
      denormQueue.push(m.id);
    }

    // -- Karya Tulis Ilmiah — open/manual_pick --
    const writeParticipants = [];
    for (let i = 0; i < 8; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c6_write.id, institution_id: i6[i % i6.length],
        name: generateName(),
        notes: `Judul KTI: ${['Inovasi Pupuk Organik', 'AI untuk Prediksi Hama', 'Smart Irrigation IoT', 'Carbon Sink Agroforestri', 'Drone Monitoring Padi', 'Fermentasi Limbah Pertanian', 'Blockchain Rantai Pasok Pangan', 'Edukasi Petani via AR'][i]}`,
      }));
      writeParticipants.push({ id: p.id, name: p.name });
    }
    const m6_write = await client.request(createItem('matches', {
      competition_category_id: c6_write.id, status: 'finished', venue: 'Ruang Sidang GWW',
      scheduled_at: offsetHours(-2 * 24),
      live_state: LS.pickFinished({ rankings: [
        { rank: 1, id: writeParticipants[2].id, name: writeParticipants[2].name },
        { rank: 2, id: writeParticipants[6].id, name: writeParticipants[6].name },
        { rank: 3, id: writeParticipants[0].id, name: writeParticipants[0].name },
      ]}),
    }));
    await client.request(createItems('match_participants', writeParticipants.map((p, i) => ({ match_id: m6_write.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m6_write.id);

    // -- Seni Rupa Digital — open/manual_pick, partially ranked (live) --
    const visualParticipants = [];
    for (let i = 0; i < 8; i++) {
      const p = await client.request(createItem('participants', {
        competition_category_id: c6_visual.id, institution_id: i6[i % i6.length],
        name: generateName(),
        notes: `Karya: ${['Digital Portrait', 'Abstract Generative', 'Pixel Art', 'AI-assisted Illustration', 'Photo Manipulation', '3D Rendering', 'Motion Graphics', 'NFT Art Concept'][i]}`,
      }));
      visualParticipants.push({ id: p.id, name: p.name });
    }
    const m6_visual = await client.request(createItem('matches', {
      competition_category_id: c6_visual.id, status: 'live', venue: 'Galeri GWW',
      scheduled_at: offsetHours(-4),
      live_state: LS.deadlineLive({ targetHours: 5 }), // 5 hours remaining
    }));
    await client.request(createItems('match_participants', visualParticipants.map((p, i) => ({ match_id: m6_visual.id, participant_id: p.id, position: i + 1 }))));
    denormQueue.push(m6_visual.id);

    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e6.id, category: 'news', is_published: true,
        published_at: offsetDays(-2), title: 'GWW Berubah Menjadi Concert Hall Bertaraf Internasional',
        slug: 'e6-n1',
        excerpt: 'Sistem tata cahaya dan suara yang dipasang malam ini setara dengan konser profesional berskala besar.',
        content: 'Para penonton yang memadati Gedung Graha Widya Wisuda (GWW) malam ini langsung terpukau saat memasuki lobby. Dekorasi yang mengombinasikan motif batik kontemporer dengan instalasi cahaya LED yang dinamis menciptakan suasana festival seni yang benar-benar immersive.\n\nSistem sound system yang disewa khusus untuk IPB Art Festival 2026 mampu mereproduksi frekuensi vokal dengan kejernihan yang luar biasa hingga ke kursi paling belakang berkapasitas 3.000 orang. Sistem ini sama persis dengan yang digunakan dalam produksi konser artis nasional kelas A.\n\n"Kami ingin para peserta merasa tampil di panggung kelas dunia. Kualitas teknis panggung harus setara dengan kualitas penampilan mereka," ujar sutradara artistik festival.',
      },
      {
        author_id: myId, event_id: e6.id, category: 'update', is_published: true,
        published_at: offsetHours(-6), title: 'Update Skor Sementara Vocal Solo: 3 Penyanyi di Atas 90 Poin',
        slug: 'e6-n2',
        excerpt: 'Persaingan Grand Final semakin panas setelah tiga penyanyi mencatatkan skor rata-rata di atas 90.',
        content: 'Setelah 8 penampilan di babak Top 10, papan skor sementara Vocal Solo Pop menunjukkan persaingan yang luar biasa ketat. Tiga penyanyi berhasil menembus angka psikologis 90 poin rata-rata dari tiga juri, sebuah pencapaian yang bahkan belum pernah terjadi di edisi sebelumnya.\n\nJuri utama, seorang musisi dan vocal coach senior, mengaku kesulitan membedakan kualitas antara penampil peringkat 1 dan 2 saat ini. "Keduanya memiliki kelebihan yang berbeda. Yang satu unggul di teknik, yang lainnya meledak di penghayatan. Ini akan menjadi grand final yang sangat menentukan," komentarnya.',
      },
      {
        author_id: myId, event_id: e6.id, category: 'announcement', is_published: true,
        published_at: offsetDays(-1), title: 'Pemenang Karya Tulis & Seni Rupa Diumumkan di Hari Pertama',
        slug: 'e6-n3',
        excerpt: 'Dua kategori pertama telah diputuskan. Inovasi di bidang agritech mendominasi kategori karya tulis.',
        content: 'Pada hari pertama IPB Art Festival 2026, dewan juri telah menyelesaikan penilaian untuk dua kategori: Karya Tulis Ilmiah dan Seni Rupa Digital.\n\nDi kategori Karya Tulis, karya yang mengangkat tema integrasi AI dengan sensor IoT untuk deteksi penyakit tanaman padi secara real-time berhasil meraih posisi teratas. Juri menilai karya ini memiliki potensi implementasi nyata yang paling tinggi dibandingkan peserta lain.\n\nSementara di Seni Rupa Digital, proses penjurian masih berlangsung dan hasil akhir akan diumumkan dalam Malam Awarding dua hari lagi.',
      },
      {
        author_id: myId, event_id: e6.id, category: 'result', is_published: true,
        published_at: offsetHours(-2), title: 'Tari Tradisional: Penampil ke-5 Raih Skor Tertinggi Sementara',
        slug: 'e6-n4',
        excerpt: 'Tarian dari daerah asal penampil yang dibawakan dengan sangat autentik memikat seluruh juri.',
        content: 'Kompetisi Tari Tradisional memasuki babak yang semakin panas. Penampil ke-5 yang membawakan tari tradisional dari daerahnya dengan kostum yang sangat autentik dan gerakan yang sangat presisi berhasil merebut skor tertinggi sementara dari panel lima juri.\n\nDua dari lima juri bahkan memberikan skor sempurna untuk aspek keaslian budaya dan ketepatan gerak. "Saya sangat terkesan dengan kedalaman pemahaman budayanya. Ini bukan sekadar meniru gerakan — ia benar-benar menghayati jiwa tarian ini," ujar juri senior.',
      },
    ]));

    // ====================================================================
    // BONUS: GLOBAL PLATFORM NEWS (event_id = null) — edge case
    // ====================================================================
    await client.request(createItems('news', [
      {
        author_id: myId, event_id: e1.id, category: 'announcement', is_published: true,
        published_at: offsetDays(-10),
        title: 'Platform IPB Lucky Sport & Art Resmi Diluncurkan',
        slug: 'platform-launch',
        excerpt: 'Platform digital real-time untuk seluruh kompetisi olahraga dan seni IPB kini hadir.',
        content: 'Institut Pertanian Bogor dengan bangga mengumumkan peluncuran resmi platform IPB Lucky Sport & Art — sebuah ekosistem digital terpadu yang mengelola, menyiarkan, dan mengarsipkan seluruh kegiatan kompetisi olahraga dan seni mahasiswa IPB.\n\nPlatform ini menggabungkan sistem manajemen pertandingan real-time, scoreboard langsung, dan portal berita terpadu dalam satu antarmuka yang mudah diakses oleh seluruh sivitas akademika, peserta, dan masyarakat umum.',
      },
      {
        author_id: myId, event_id: e1.id, category: 'news', is_published: false, // EDGE: unpublished global news
        published_at: null,
        title: '[DRAFT] Rencana Roadmap Platform Q3 2026',
        slug: 'platform-roadmap-q3-draft',
        excerpt: 'Draft roadmap internal — belum untuk publik.',
        content: 'Draft berisi rencana fitur bracket generator, notifikasi push, dan integrasi single sign-on.',
      },
    ]));

    // ====================================================================
    // DYNAMIC NEWS ADJUSTMENT (Force exact counts: 0, 3, 6, 9, 12, 15)
    // ====================================================================
    console.log('📰 Adjusting news counts per event...');
    
    const newsTargets =[
      { eId: e5.id, count: 0, prefix: 'Futsal' },
      { eId: e6.id, count: 3, prefix: 'ArtFest' },
      { eId: e4.id, count: 6, prefix: 'Hacktoday' },
      { eId: e3.id, count: 9, prefix: 'Marathon' },
      { eId: e2.id, count: 12, prefix: 'Badminton' },
      { eId: e1.id, count: 15, prefix: 'Karate' },
    ];
    
    for (const target of newsTargets) {
      const existing = await client.request(readItems('news', { filter: { event_id: { _eq: target.eId } } }));
      
      if (existing.length > target.count) {
        // Trim excess (e.g., Futsal has 2 hardcoded but target is 0)
        const toDelete = existing.slice(target.count).map(n => n.id);
        await client.request(deleteItems('news', toDelete));
      } else if (existing.length < target.count) {
        // Pad with dynamic data to reach exact target
        const needed = target.count - existing.length;
        const newItems =[];
        for(let i = 0; i < needed; i++) {
          newItems.push({
            author_id: myId,
            event_id: target.eId,
            category: randomPick(['news', 'update', 'announcement', 'result']),
            title: `${target.prefix} Update #${existing.length + i + 1}: ${randomPick(['Persiapan Semakin Matang', 'Kejutan Terjadi Hari Ini', 'Rekor Baru Tercipta', 'Antusiasme Penonton Membludak', 'Jadwal Pertandingan Berubah', 'Evaluasi Tengah Turnamen'])}`,
            slug: `auto-news-${target.eId.substring(0,5)}-${Date.now()}-${i}`,
            excerpt: 'Berita otomatis untuk update terkini seputar berjalannya acara dan perolehan skor sementara.',
            content: `Ini adalah rilis berita otomatis. ${generateName()} selaku perwakilan panitia membagikan pandangannya mengenai event ini. Seluruh pihak berharap acara berjalan lancar hingga hari terakhir penutupan.`,
            is_published: true,
            published_at: offsetHours(-randomInt(1, 48))
          });
        }
        await client.request(createItems('news', newItems));
      }
    }

    // ====================================================================
    // DENORMALIZATION — trigger PGSQL trigger for all finished/live matches
    // ====================================================================
    console.log('\n⚙️  Running denormalization...');
    await triggerDenorm(denormQueue);

    // ====================================================================
    // SUMMARY
    // ====================================================================
    console.log('\n✅ ULTIMATE SEED COMPLETE!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('COVERAGE SUMMARY:');
    console.log('');
    console.log('EVENTS (6):');
    console.log('  [1] FORKI × IPB Cup 2026       — sport, active,    karate');
    console.log('  [2] IPB Badminton Cup 2026      — sport, active,    badminton');
    console.log('  [3] IPB Berlari 2026            — sport, finished,  marathon');
    console.log('  [4] IT-TODAY Hacktoday 2026     — sport, finished,  hackathon');
    console.log('  [5] IPB Futsal Cup 2026         — sport, upcoming,  futsal (reg open)');
    console.log('  [6] IPB Art Festival 2026       — arts,  active,    performing arts');
    console.log('');
    console.log('FORMATS COVERED:');
    console.log('  ✅ judge_scores (drop_extremes, avg, 3-juri, 5-juri)');
    console.log('  ✅ score_timed (with/without periods)');
    console.log('  ✅ score_sets (best-of-3, best-of-5)');
    console.log('  ✅ finish_time ASC (individual + team relay)');
    console.log('  ✅ manual_pick ranked (hackathon, KTI, seni rupa, futsal penalty)');
    console.log('  ✅ timer countdown + stopwatch as add-ons');
    console.log('  ✅ notes add-on');
    console.log('  ✅ open match WITHOUT timer (hackathon)');
    console.log('');
    console.log('MATCH STATUSES:');
    console.log('  ✅ upcoming    — solo, h2h, open');
    console.log('  ✅ live        — all format types');
    console.log('  ✅ finished    — all format types + draw + null winner');
    console.log('  ✅ cancelled   — Kumite Putri -50kg Final');
    console.log('');
    console.log('EDGE CASES:');
    console.log('  ✅ timerRunning=true, timerLastStarted=null (corrupted timer)');
    console.log('  ✅ countdown at timerSecs=0 (exhausted countdown)');
    console.log('  ✅ winner=null, homeScore=awayScore (draw)');
    console.log('  ✅ status=cancelled match');
    console.log('  ✅ category with format_id=null');
    console.log('  ✅ match with home/away both null (futsal knockout TBD)');
    console.log('  ✅ partial judgeScores array (some null)');
    console.log('  ✅ partial rankings in live manual_pick');
    console.log('  ✅ news with event_id=null (global news)');
    console.log('  ✅ unpublished news (is_published=false)');
    console.log('  ✅ event with status=finished');
    console.log('  ✅ event with is_registration_open=true (upcoming event)');
    console.log('  ✅ team participants with members JSONB');
    console.log('  ✅ participants with seed numbers');
    console.log('  ✅ participants with notes field');
    console.log('  ✅ 5-set badminton final (Best of 5)');
    console.log('  ✅ relay team (open match, team participant)');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('\n❌ SEED FAILED:', err.message || err);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    process.exit(1);
  }
}

seed();
