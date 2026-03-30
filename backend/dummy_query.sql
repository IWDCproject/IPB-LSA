DO $$
DECLARE
    v_user_id uuid;

    -- Event IDs
    e1 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000001';
    e2 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000002';
    e3 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000003';
    e4 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000004';
    e5 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000005';

    -- Institution IDs (scoped per event)
    i1_ipb   uuid := 'b1000001-b100-4000-9999-000000000001';
    i1_ui    uuid := 'b1000001-b100-4000-9999-000000000002';
    i1_itb   uuid := 'b1000001-b100-4000-9999-000000000003';
    i1_upn   uuid := 'b1000001-b100-4000-9999-000000000004';
    i1_ugm   uuid := 'b1000001-b100-4000-9999-000000000005';
    i1_its   uuid := 'b1000001-b100-4000-9999-000000000006';

    i2_ipb   uuid := 'b2000002-b200-4000-9999-000000000001';
    i2_ui    uuid := 'b2000002-b200-4000-9999-000000000002';
    i2_itb   uuid := 'b2000002-b200-4000-9999-000000000003';
    i2_binus uuid := 'b2000002-b200-4000-9999-000000000004';

    i3_ipb   uuid := 'b3000003-b300-4000-9999-000000000001';
    i3_ui    uuid := 'b3000003-b300-4000-9999-000000000002';
    i3_unpad uuid := 'b3000003-b300-4000-9999-000000000003';
    i3_ugm   uuid := 'b3000003-b300-4000-9999-000000000004';
    i3_its   uuid := 'b3000003-b300-4000-9999-000000000005';

    -- Category IDs
    c1_kata_pa  uuid := 'c1000001-c100-4000-b222-000000000001';
    c1_kata_pi  uuid := 'c1000001-c100-4000-b222-000000000002';
    c1_kum60    uuid := 'c1000001-c100-4000-b222-000000000003';
    c1_kum67    uuid := 'c1000001-c100-4000-b222-000000000004';

    c2_hack_ai  uuid := 'c2000002-c200-4000-b222-000000000001';
    c2_hack_web uuid := 'c2000002-c200-4000-b222-000000000002';

    c3_21km     uuid := 'c3000003-c300-4000-b222-000000000001';
    c3_10km     uuid := 'c3000003-c300-4000-b222-000000000002';

    -- Match Format IDs
    f1_kata     uuid := 'f1000001-f100-4000-e555-000000000001';
    f1_kumite   uuid := 'f1000001-f100-4000-e555-000000000002';
    f2_hack     uuid := 'f2000002-f200-4000-e555-000000000001';
    f3_marathon uuid := 'f3000003-f300-4000-e555-000000000001';

    -- Participant IDs — Kata Perorang Putra
    p1_1 uuid := 'd1000001-d100-4000-c333-000000000001';
    p1_2 uuid := 'd1000001-d100-4000-c333-000000000002';
    p1_3 uuid := 'd1000001-d100-4000-c333-000000000003';
    p1_4 uuid := 'd1000001-d100-4000-c333-000000000004';

    -- Kata Perorang Putri
    p2_1 uuid := 'd2000002-d200-4000-c333-000000000001';
    p2_2 uuid := 'd2000002-d200-4000-c333-000000000002';
    p2_3 uuid := 'd2000002-d200-4000-c333-000000000003';
    p2_4 uuid := 'd2000002-d200-4000-c333-000000000004';

    -- Kumite -60kg
    p3_1 uuid := 'd3000003-d300-4000-c333-000000000001';
    p3_2 uuid := 'd3000003-d300-4000-c333-000000000002';
    p3_3 uuid := 'd3000003-d300-4000-c333-000000000003';
    p3_4 uuid := 'd3000003-d300-4000-c333-000000000004';

    -- Kumite -67kg
    p4_1 uuid := 'd4000004-d400-4000-c333-000000000001';
    p4_2 uuid := 'd4000004-d400-4000-c333-000000000002';
    p4_3 uuid := 'd4000004-d400-4000-c333-000000000003';
    p4_4 uuid := 'd4000004-d400-4000-c333-000000000004';

    -- Hackathon AI Track
    p5_1 uuid := 'd5000005-d500-4000-c333-000000000001';
    p5_2 uuid := 'd5000005-d500-4000-c333-000000000002';
    p5_3 uuid := 'd5000005-d500-4000-c333-000000000003';

    -- Hackathon Web Track
    p6_1 uuid := 'd6000006-d600-4000-c333-000000000001';
    p6_2 uuid := 'd6000006-d600-4000-c333-000000000002';
    p6_3 uuid := 'd6000006-d600-4000-c333-000000000003';

    -- Marathon 21km
    p7_1 uuid := 'd7000007-d700-4000-c333-000000000001';
    p7_2 uuid := 'd7000007-d700-4000-c333-000000000002';
    p7_3 uuid := 'd7000007-d700-4000-c333-000000000003';
    p7_4 uuid := 'd7000007-d700-4000-c333-000000000004';
    p7_5 uuid := 'd7000007-d700-4000-c333-000000000005';

    -- Marathon 10km
    p8_1 uuid := 'd8000008-d800-4000-c333-000000000001';
    p8_2 uuid := 'd8000008-d800-4000-c333-000000000002';
    p8_3 uuid := 'd8000008-d800-4000-c333-000000000003';

    -- Match IDs
    m1  uuid := 'f4000001-f400-4000-d444-000000000001';
    m2  uuid := 'f4000001-f400-4000-d444-000000000002';
    m3  uuid := 'f4000001-f400-4000-d444-000000000003';
    m4  uuid := 'f4000001-f400-4000-d444-000000000004';
    m5  uuid := 'f4000001-f400-4000-d444-000000000005';
    m6  uuid := 'f4000001-f400-4000-d444-000000000006';
    m7  uuid := 'f4000001-f400-4000-d444-000000000007';
    m8  uuid := 'f4000001-f400-4000-d444-000000000008';
    m9  uuid := 'f4000001-f400-4000-d444-000000000009';
    m10 uuid := 'f4000001-f400-4000-d444-000000000010';
    m11 uuid := 'f4000001-f400-4000-d444-000000000011';
    m12 uuid := 'f4000001-f400-4000-d444-000000000012';

BEGIN
    SELECT id INTO v_user_id FROM directus_users LIMIT 1;

    -- ─── 0. CLEAR OLD DATA ────────────────────────────────────────────────────
    TRUNCATE TABLE
        match_participants, matches, participants,
        institutions, competition_categories, match_formats,
        event_phases, news, events
    CASCADE;

    -- Set org name on the admin user
    UPDATE directus_users SET organisation_name = 'IWDC' WHERE id = v_user_id;

    -- ─── 1. EVENTS ────────────────────────────────────────────────────────────
    INSERT INTO events (id, user_created, name, slug, type, status, is_published, is_registration_open, start_date, end_date, location, description, contact_person, registration_end_date) VALUES

    (e1, v_user_id,
     'FORKI X IPB CUP 2026', 'forki-ipb-2026', 'sport', 'active', true, false,
     '2026-03-25', '2026-03-28',
     'Gymnasium IPB, Bogor',
     'Turnamen karate antar universitas terbesar se-Jawa Barat. Mempertemukan atlet-atlet terbaik dari berbagai perguruan tinggi dalam cabang Kata dan Kumite.',
     '{"name":"Gilang Ramadhan","phone":"081234567890","email":"karate@ipb.ac.id"}',
     null),

    (e2, v_user_id,
     'IT-TODAY HACKTODAY 2026', 'hacktoday-2026', 'sport', 'active', true, false,
     '2026-03-26', '2026-03-27',
     'Auditorium Andi Hakim Nasoetion, IPB',
     'Hackathon teknologi terbesar di IPB University. Peserta berlomba membangun solusi inovatif berbasis AI dan Web dalam 24 jam.',
     '{"name":"Arya Faiz","phone":"082345678901","email":"ittoday@ipb.ac.id"}',
     null),

    (e3, v_user_id,
     'IPB BERLARI 2026', 'ipb-berlari-2026', 'sport', 'active', true, true,
     '2026-05-03', '2026-05-03',
     'Lingkar Kampus IPB, Bogor',
     'Event lari tahunan IPB University dengan rute melintasi kawasan kampus dan hutan penelitian. Tersedia kategori 10km dan 21km untuk semua kalangan.',
     '{"name":"Reza Nur","phone":"083456789012","email":"berlari@ipb.ac.id"}',
     '2026-04-25 23:59:00+07'),

    (e4, v_user_id,
     'FESTIVAL SENI IPB 2026', 'festival-seni-ipb-2026', 'arts', 'upcoming', true, true,
     '2026-06-10', '2026-06-12',
     'Grha Widya Wisuda IPB, Bogor',
     'Perayaan seni dan budaya terbesar di IPB University. Menampilkan kompetisi tari tradisional, musik akustik, dan pertunjukan teater dari berbagai UKM.',
     '{"name":"Siti Rahma","phone":"084567890123","email":"seni@ipb.ac.id"}',
     '2026-05-30 23:59:00+07'),

    (e5, v_user_id,
     'IPB FUTSAL CUP 2026', 'ipb-futsal-2026', 'sport', 'upcoming', true, true,
     '2026-07-15', '2026-07-20',
     'GOR Futsal IPB, Bogor',
     'Turnamen futsal antar fakultas dan UKM IPB University. Format grup dan knockout untuk putra dan putri.',
     '{"name":"Budi Santoso","phone":"085678901234","email":"futsal@ipb.ac.id"}',
     '2026-07-01 23:59:00+07');

    -- ─── 2. EVENT PHASES ──────────────────────────────────────────────────────
    INSERT INTO event_phases (event_id, label, description, date_start, date_end, time_start, status, display_order) VALUES
    -- FORKI IPB
    (e1, 'Pendaftaran',       'Pendaftaran peserta untuk semua kategori',        '2026-03-01', '2026-03-20', '08:00', 'done',     1),
    (e1, 'Technical Meeting', 'Pertemuan teknis peserta dan official',            '2026-03-24', null,         '14:00', 'done',     2),
    (e1, 'Babak Penyisihan',  'Pertandingan penyisihan semua kategori',           '2026-03-25', '2026-03-26', '08:00', 'current',  3),
    (e1, 'Semifinal & Final', 'Babak semifinal dan final semua kategori',         '2026-03-27', '2026-03-28', '08:00', 'upcoming', 4),
    -- IPB Berlari
    (e3, 'Pendaftaran',       'Pendaftaran online dibuka',                        '2026-03-15', '2026-04-25', '08:00', 'current',  1),
    (e3, 'Pengambilan BIB',   'Pengambilan nomor dada peserta di GOR IPB',        '2026-05-02', null,         '08:00', 'upcoming', 2),
    (e3, 'Race Day',          'Start pukul 05.00 dari Gerbang Utama Kampus IPB', '2026-05-03', null,         '05:00', 'upcoming', 3);

    -- ─── 3. MATCH FORMATS ─────────────────────────────────────────────────────
    INSERT INTO match_formats (id, event_id, name, match_type, modules, created_by) VALUES

    (f1_kata, e1, 'Kata Solo Format', 'solo',
     '[{"type":"judge_scores","config":{"num_judges":5,"score_min":0,"score_max":10,"step":0.1,"method":"drop_extremes"}},{"type":"notes","config":{}}]',
     v_user_id),

    (f1_kumite, e1, 'Kumite H2H Format', 'head_to_head',
     '[{"type":"score_timed","config":{"score_label":"Poin","has_periods":false}},{"type":"timer","config":{"mode":"countdown","duration":180}},{"type":"notes","config":{}}]',
     v_user_id),

    (f2_hack, e2, 'Hackathon Open Format', 'open',
     '[{"type":"manual_pick","config":{"top_n":3,"ranked_order":true}}]',
     v_user_id),

    (f3_marathon, e3, 'Marathon Finish Time', 'open',
     '[{"type":"finish_time","config":{"unit":"min","rank_order":"asc"}},{"type":"notes","config":{}}]',
     v_user_id);

    -- ─── 4. COMPETITION CATEGORIES ────────────────────────────────────────────
    INSERT INTO competition_categories (id, event_id, format_id, name, participant_type, display_order) VALUES
    (c1_kata_pa,  e1, f1_kata,    'Kata Perorang Putra',   'individual', 1),
    (c1_kata_pi,  e1, f1_kata,    'Kata Perorang Putri',   'individual', 2),
    (c1_kum60,    e1, f1_kumite,  'Kumite -60kg Putra',    'individual', 3),
    (c1_kum67,    e1, f1_kumite,  'Kumite -67kg Putra',    'individual', 4),
    (c2_hack_ai,  e2, f2_hack,    'Hackathon AI Track',    'team',       1),
    (c2_hack_web, e2, f2_hack,    'Hackathon Web Track',   'team',       2),
    (c3_21km,     e3, f3_marathon,'Open Marathon 21km',    'individual', 1),
    (c3_10km,     e3, f3_marathon,'Open Marathon 10km',    'individual', 2);

    -- ─── 5. INSTITUTIONS ──────────────────────────────────────────────────────
    INSERT INTO institutions (id, event_id, name) VALUES
    (i1_ipb,   e1, 'IPB University'),
    (i1_ui,    e1, 'Universitas Indonesia'),
    (i1_itb,   e1, 'Institut Teknologi Bandung'),
    (i1_upn,   e1, 'UPN Veteran Yogyakarta'),
    (i1_ugm,   e1, 'Universitas Gadjah Mada'),
    (i1_its,   e1, 'Institut Teknologi Sepuluh Nopember'),

    (i2_ipb,   e2, 'IPB University'),
    (i2_ui,    e2, 'Universitas Indonesia'),
    (i2_itb,   e2, 'Institut Teknologi Bandung'),
    (i2_binus, e2, 'BINUS University'),

    (i3_ipb,   e3, 'IPB University'),
    (i3_ui,    e3, 'Universitas Indonesia'),
    (i3_unpad, e3, 'Universitas Padjadjaran'),
    (i3_ugm,   e3, 'Universitas Gadjah Mada'),
    (i3_its,   e3, 'Institut Teknologi Sepuluh Nopember');

    -- ─── 6. PARTICIPANTS ──────────────────────────────────────────────────────

    -- Kata Perorang Putra
    INSERT INTO participants (id, competition_category_id, institution_id, name, seed) VALUES
    (p1_1, c1_kata_pa, i1_ipb, 'Ahmad Fauzi',    1),
    (p1_2, c1_kata_pa, i1_ui,  'Bima Sakti',     2),
    (p1_3, c1_kata_pa, i1_itb, 'Cahya Nugraha',  3),
    (p1_4, c1_kata_pa, i1_ugm, 'Dani Prasetyo',  4);

    -- Kata Perorang Putri
    INSERT INTO participants (id, competition_category_id, institution_id, name, seed) VALUES
    (p2_1, c1_kata_pi, i1_ipb, 'Sari Dewi',      1),
    (p2_2, c1_kata_pi, i1_ui,  'Rina Kusuma',    2),
    (p2_3, c1_kata_pi, i1_upn, 'Mega Putri',     3),
    (p2_4, c1_kata_pi, i1_its, 'Indah Permata',  4);

    -- Kumite -60kg Putra
    INSERT INTO participants (id, competition_category_id, institution_id, name, seed) VALUES
    (p3_1, c1_kum60, i1_ipb, 'Rizky Maulana',  1),
    (p3_2, c1_kum60, i1_ui,  'Eko Santoso',    2),
    (p3_3, c1_kum60, i1_itb, 'Fajar Hidayat',  3),
    (p3_4, c1_kum60, i1_ugm, 'Galih Prakoso',  4);

    -- Kumite -67kg Putra
    INSERT INTO participants (id, competition_category_id, institution_id, name, seed) VALUES
    (p4_1, c1_kum67, i1_ipb, 'Hendra Wijaya',  1),
    (p4_2, c1_kum67, i1_ui,  'Ivan Kurniawan', 2),
    (p4_3, c1_kum67, i1_its, 'Joko Susilo',    3),
    (p4_4, c1_kum67, i1_ugm, 'Kevin Halim',    4);

    -- Hackathon AI Track
    INSERT INTO participants (id, competition_category_id, institution_id, name, members) VALUES
    (p5_1, c2_hack_ai, i2_ipb,  'Team Agritech AI',   '["Hendra Gunawan", "Ika Sari", "Joko Widodo"]'),
    (p5_2, c2_hack_ai, i2_ui,   'Team DataSci UI',    '["Kevin Pratama", "Lisa Amalia", "Marco Huang"]'),
    (p5_3, c2_hack_ai, i2_itb,  'Team Bandung AI',    '["Nico Herlambang", "Olivia Tan", "Putra Aditya"]');

    -- Hackathon Web Track
    INSERT INTO participants (id, competition_category_id, institution_id, name, members) VALUES
    (p6_1, c2_hack_web, i2_ipb,  'Team BogorDev',  '["Qori Nasution", "Rani Wulandari", "Sandro Putra"]'),
    (p6_2, c2_hack_web, i2_binus,'Team BINUSweb',  '["Tika Rahayu", "Umar Faruq", "Vina Chandra"]'),
    (p6_3, c2_hack_web, i2_ui,   'Team UIX',       '["Wahyu Hidayat", "Xena Kristianti", "Yogi Satria"]');

    -- Marathon 21km
    INSERT INTO participants (id, competition_category_id, institution_id, name) VALUES
    (p7_1, c3_21km, i3_ipb,   'Reza Rahardian'),
    (p7_2, c3_21km, i3_ui,    'Surya Perdana'),
    (p7_3, c3_21km, i3_ipb,   'Tri Wibowo'),
    (p7_4, c3_21km, i3_unpad, 'Udin Setiawan'),
    (p7_5, c3_21km, i3_ugm,   'Vito Ramadhan');

    -- Marathon 10km
    INSERT INTO participants (id, competition_category_id, institution_id, name) VALUES
    (p8_1, c3_10km, i3_ipb,  'Wulan Sari'),
    (p8_2, c3_10km, i3_ui,   'Xander Lie'),
    (p8_3, c3_10km, i3_its,  'Yanti Kusuma');

    -- ─── 7. MATCHES ───────────────────────────────────────────────────────────

    INSERT INTO matches (id, competition_category_id, round, match_name, venue, scheduled_at, status, home_participant_id, away_participant_id, live_state) VALUES

    -- Kata Putra Semifinal 1 (finished — Ahmad menang)
    (m1, c1_kata_pa, 'Semifinal', 'Kata Putra — Semifinal 1', 'Lapangan A', now() - interval '3 hours', 'finished',
     p1_1, p1_3,
     '{"matchStatus":"finished","winner":"home","judgeScores":[8.0,7.9,8.1,7.8,8.2],"notes":""}'::jsonb),

    -- Kata Putra Semifinal 2 (finished — Bima menang)
    (m2, c1_kata_pa, 'Semifinal', 'Kata Putra — Semifinal 2', 'Lapangan A', now() - interval '2 hours', 'finished',
     p1_2, p1_4,
     '{"matchStatus":"finished","winner":"home","judgeScores":[8.3,8.1,8.4,8.0,8.2],"notes":""}'::jsonb),

    -- Kata Putra Final (LIVE — Ahmad vs Bima)
    (m3, c1_kata_pa, 'Final', 'Kata Putra — Final', 'Lapangan A', now() - interval '10 minutes', 'live',
     p1_1, p1_2,
     '{"matchStatus":"live","judgeScores":[8.2,8.5,8.1,8.4,8.3],"notes":"Penampilan Ahmad sangat bersih"}'::jsonb),

    -- Kata Putri Final (upcoming)
    (m4, c1_kata_pi, 'Final', 'Kata Putri — Final', 'Lapangan A', now() + interval '1 hour', 'upcoming',
     p2_1, p2_2,
     '{"matchStatus":"upcoming"}'::jsonb),

    -- Kumite -60kg Semifinal 1 (finished)
    (m5, c1_kum60, 'Semifinal', 'Kumite -60kg — Semifinal 1', 'Lapangan B', now() - interval '3 hours', 'finished',
     p3_1, p3_3,
     '{"matchStatus":"finished","winner":"home","homeScore":7,"awayScore":2,"timerSecs":0,"timerRunning":false}'::jsonb),

    -- Kumite -60kg Semifinal 2 (finished)
    (m6, c1_kum60, 'Semifinal', 'Kumite -60kg — Semifinal 2', 'Lapangan B', now() - interval '2 hours', 'finished',
     p3_2, p3_4,
     '{"matchStatus":"finished","winner":"home","homeScore":5,"awayScore":4,"timerSecs":0,"timerRunning":false}'::jsonb),

    -- Kumite -60kg Final (LIVE — Rizky vs Eko)
    -- FIX: timerLastStarted was now()-93s with timerSecs:87 → timer already expired while timerRunning:true.
    --      Corrected: timerSecs:87 with timerLastStarted now()-5s → currentSecs = 87-5 = 82s remaining.
    (m7, c1_kum60, 'Final', 'Kumite -60kg — Final', 'Lapangan B', now() - interval '8 minutes', 'live',
     p3_1, p3_2,
     ('{"matchStatus":"live","homeScore":5,"awayScore":3,"timerSecs":87,"timerRunning":true,"timerLastStarted":"' || to_char(now() - interval '5 seconds', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || '","periodIdx":0,"periodPhase":"active","notes":""}')::jsonb),

    -- Hackathon AI Track — Open match (LIVE, 18 jam berjalan)
    -- FIX: removed dead timer fields — format f2_hack has no timer module, those fields are noise.
    (m8, c2_hack_ai, 'Main Event', 'Hackathon AI Track', 'Auditorium AHN', now() - interval '18 hours', 'live',
     null, null,
     '{"matchStatus":"live","rankings":[],"notes":"Sesi presentasi dimulai pukul 14.00 WIB"}'::jsonb),

    -- Hackathon Web Track — Open match (LIVE)
    -- FIX: same as m8 — timer fields removed.
    (m9, c2_hack_web, 'Main Event', 'Hackathon Web Track', 'Auditorium AHN', now() - interval '18 hours', 'live',
     null, null,
     '{"matchStatus":"live","rankings":[],"notes":""}'::jsonb),

    -- Marathon 21km (upcoming — race day 3 Mei)
    (m10, c3_21km, 'Final', 'Open Marathon 21km', 'Gerbang Utama IPB', '2026-05-03 05:00:00+07', 'upcoming',
     null, null,
     '{"matchStatus":"upcoming","timeLog":[],"rankings":[]}'::jsonb),

    -- Marathon 10km (upcoming)
    (m11, c3_10km, 'Final', 'Open Marathon 10km', 'Gerbang Utama IPB', '2026-05-03 05:30:00+07', 'upcoming',
     null, null,
     '{"matchStatus":"upcoming","timeLog":[],"rankings":[]}'::jsonb),

    -- Kumite -67kg Final (upcoming)
    (m12, c1_kum67, 'Final', 'Kumite -67kg — Final', 'Lapangan B', now() + interval '2 hours', 'upcoming',
     p4_1, p4_2,
     '{"matchStatus":"upcoming"}'::jsonb);

    -- ─── 8. MATCH PARTICIPANTS (open matches only) ────────────────────────────
    INSERT INTO match_participants (match_id, participant_id, position) VALUES
    (m8,  p5_1, 1),
    (m8,  p5_2, 2),
    (m8,  p5_3, 3),
    (m9,  p6_1, 1),
    (m9,  p6_2, 2),
    (m9,  p6_3, 3),
    (m10, p7_1, 1),
    (m10, p7_2, 2),
    (m10, p7_3, 3),
    (m10, p7_4, 4),
    (m10, p7_5, 5),
    (m11, p8_1, 1),
    (m11, p8_2, 2),
    (m11, p8_3, 3);

    -- ─── 9. SYNC DENORMALIZED COLUMNS ────────────────────────────────────────
    -- The trg_match_denorm trigger only fires on UPDATE, not INSERT.
    -- Run a no-op UPDATE to backfill winner, home_score, away_score, timer_secs
    -- from live_state for all matches that already have meaningful data.
    UPDATE matches
    SET
      winner     = live_state->>'winner',
      home_score = COALESCE((live_state->>'homeScore')::int, 0),
      away_score = COALESCE((live_state->>'awayScore')::int, 0),
      timer_secs = COALESCE((live_state->>'timerSecs')::int, 0),
      rankings   = CASE
        WHEN live_state ? 'rankings'
         AND jsonb_array_length(live_state->'rankings') > 0
        THEN live_state->'rankings'
        ELSE NULL
      END
    WHERE status IN ('finished', 'live');

    -- ─── 10. NEWS ─────────────────────────────────────────────────────────────
    INSERT INTO news (author_id, event_id, category, title, slug, excerpt, content, is_published, published_at) VALUES

    (v_user_id, e1, 'announcement',
     'FORKI X IPB CUP 2026 Resmi Dibuka',
     'forki-ipb-2026-dibuka',
     'Lebih dari 200 atlet dari 6 perguruan tinggi hadir di Gymnasium IPB untuk memperebutkan gelar juara.',
     'Turnamen karate FORKI X IPB CUP 2026 resmi dibuka hari ini di Gymnasium IPB University, Bogor. Lebih dari 200 atlet dari 6 perguruan tinggi hadir bersaing dalam empat kategori: Kata Perorang Putra, Kata Perorang Putri, Kumite -60kg, dan Kumite -67kg Putra.' || E'\n\n' || 'Ketua panitia menyampaikan bahwa event ini merupakan ajang tahunan yang bertujuan mempererat silaturahmi antar mahasiswa melalui olahraga beladiri.',
     true, now() - interval '1 day'),

    (v_user_id, e1, 'result',
     'Ahmad Fauzi Melaju ke Final Kata Perorang Putra',
     'ahmad-fauzi-final-kata-putra',
     'Ahmad Fauzi dari IPB University berhasil meraih tiket final dengan nilai rata-rata 8.0 dari panel lima juri.',
     'Ahmad Fauzi dari IPB University memastikan diri melaju ke babak final Kata Perorang Putra setelah tampil impresif di semifinal. Dengan nilai rata-rata 8.0 dari panel lima juri, ia mengalahkan Cahya Nugraha dari ITB.' || E'\n\n' || 'Di final, Ahmad akan berhadapan dengan Bima Sakti dari Universitas Indonesia yang juga tampil konsisten sepanjang turnamen.',
     true, now() - interval '1 hour'),

    (v_user_id, e1, 'result',
     'Rizky Maulana Unggul di Semifinal Kumite -60kg',
     'rizky-maulana-semifinal-kumite-60',
     'Rizky Maulana dari IPB menang telak 7-2 atas Fajar Hidayat dari ITB dan melaju ke babak final.',
     'Rizky Maulana dari IPB University tampil dominan di babak semifinal Kumite -60kg Putra dengan kemenangan 7-2 atas Fajar Hidayat dari Institut Teknologi Bandung.' || E'\n\n' || 'Di final yang dijadwalkan berlangsung malam ini, Rizky akan menghadapi Eko Santoso dari Universitas Indonesia.',
     true, now() - interval '90 minutes'),

    (v_user_id, e2, 'announcement',
     'IT-TODAY HACKTODAY 2026 Resmi Dimulai',
     'hacktoday-2026-dimulai',
     '9 tim dari 4 universitas bersaing selama 24 jam membangun solusi teknologi dalam dua track: AI dan Web.',
     'IT-TODAY HACKTODAY 2026 resmi dimulai pukul 08.00 WIB dengan kick-off ceremony di Auditorium Andi Hakim Nasoetion. Sebanyak 9 tim dari 4 universitas akan bersaing selama 24 jam penuh dalam dua track: AI Track dan Web Development Track.' || E'\n\n' || 'Sesi presentasi dan penjurian dijadwalkan pada pukul 14.00 WIB hari ini.',
     true, now() - interval '18 hours'),

    (v_user_id, e3, 'announcement',
     'Pendaftaran IPB BERLARI 2026 Masih Dibuka',
     'ipb-berlari-2026-pendaftaran',
     'Pendaftaran masih dibuka hingga 25 April 2026. Tersedia kategori 10km dan 21km dengan jersey eksklusif untuk semua peserta.',
     'IPB BERLARI 2026 masih membuka pendaftaran hingga 25 April 2026. Event lari tahunan ini diselenggarakan pada 3 Mei 2026 dengan start dan finish di Gerbang Utama Kampus IPB, Bogor.' || E'\n\n' || 'Tersedia dua kategori: 10km untuk peserta umum dan 21km (half marathon) untuk pelari berpengalaman. Seluruh peserta mendapatkan jersey eksklusif, medali finisher, dan goodie bag.',
     true, now() - interval '3 days'),

    (v_user_id, null, 'announcement',
     'IWDC Membuka Pendaftaran Event Baru untuk Semester Genap',
     'iwdc-pendaftaran-event-semester-genap',
     'Unit kegiatan mahasiswa dapat mengajukan proposal event olahraga dan seni untuk periode Juni–Agustus 2026.',
     'IWDC (IPB Web Development Community) membuka pendaftaran bagi unit kegiatan mahasiswa yang ingin menyelenggarakan event olahraga atau seni pada periode Juni–Agustus 2026.' || E'\n\n' || 'Proposal dapat diajukan melalui platform ini. Setiap event yang disetujui akan mendapatkan dukungan teknis untuk pengelolaan pertandingan dan publikasi secara digital.',
     true, now() - interval '5 days');

    -- ─── 11. DIRECTUS PERMISSIONS ─────────────────────────────────────────────
    INSERT INTO directus_permissions (policy, collection, action, fields, permissions)
    SELECT id, 'directus_users', 'read', ARRAY['organisation_name'], '{}'
    FROM directus_policies
    WHERE name = '$t:public_label'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✓ Seeding selesai: 5 events, 8 kategori, 27 peserta, 12 matches, 6 berita';
END $$;