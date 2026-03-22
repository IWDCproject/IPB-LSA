-- File ini hanya sebagai referensi/dokumentasi bagaimana data awal dimasukkan.
-- Data di bawah ini sudah otomatis ter-include di dalam init_db.sql.

DO $$
DECLARE
    v_user_id uuid;
    e1 uuid := gen_random_uuid(); e2 uuid := gen_random_uuid(); e3 uuid := gen_random_uuid();
    c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid();
    p1a uuid := gen_random_uuid(); p1b uuid := gen_random_uuid(); p1c uuid := gen_random_uuid(); p1d uuid := gen_random_uuid();
    p2a uuid := gen_random_uuid(); p2b uuid := gen_random_uuid(); p2c uuid := gen_random_uuid(); p2d uuid := gen_random_uuid();
    p3a uuid := gen_random_uuid(); p3b uuid := gen_random_uuid(); p3c uuid := gen_random_uuid(); p3d uuid := gen_random_uuid();
    m1a uuid := gen_random_uuid(); m1b uuid := gen_random_uuid(); m1c uuid := gen_random_uuid();
    m2a uuid := gen_random_uuid(); m2b uuid := gen_random_uuid(); m2c uuid := gen_random_uuid();
    m3a uuid := gen_random_uuid(); m3b uuid := gen_random_uuid(); m3c uuid := gen_random_uuid();
BEGIN
    SELECT id INTO v_user_id FROM directus_users LIMIT 1;

    INSERT INTO events (id, user_created, name, slug, type, status, is_published, start_date, location, description) VALUES
    (e1, v_user_id, 'IPB Art 2026', 'ipb-art-2026', 'arts', 'upcoming', true, '2026-06-01', 'Gedung Graha Widya Wisuda', 'Festival seni terbesar yang menampilkan karya luar biasa dari mahasiswa IPB.'),
    (e2, v_user_id, 'IPB Karate Championship', 'ipb-karate-2026', 'sport', 'upcoming', true, '2026-07-15', 'Gymnasium IPB', 'Kejuaraan Karate bergengsi antar fakultas dan UKM di lingkungan IPB.'),
    (e3, v_user_id, 'IPB E-Sports League', 'ipb-esports-2026', 'sport', 'upcoming', true, '2026-08-20', 'Auditorium FMIPA', 'Liga E-Sports tahunan terbesar mempertandingkan game populer.');

    INSERT INTO competition_categories (id, event_id, name, participant_type) VALUES
    (c1, e1, 'Live Painting Competition', 'individual'),
    (c2, e2, 'Kumite Putra -60kg', 'individual'),
    (c3, e3, 'Mobile Legends Team', 'team');

    INSERT INTO participants (id, competition_category_id, name) VALUES
    (p1a, c1, 'Karya Rupa Faperta'), (p1b, c1, 'Kuas Fakultas Kehutanan'), (p1c, c1, 'Palet FMIPA'), (p1d, c1, 'Garis SV'),
    (p2a, c2, 'Dojo Fakultas Teknik'), (p2b, c2, 'Dojo FPIK'), (p2c, c2, 'Dojo FEM'), (p2d, c2, 'Dojo FKH'),
    (p3a, c3, 'Fasilkom Esports'), (p3b, c3, 'Fateta Gaming'), (p3c, c3, 'SB IPB Legends'), (p3d, c3, 'Vokasi Team');

    INSERT INTO matches (id, competition_category_id, match_name, status, scheduled_at, home_participant_id, away_participant_id) VALUES
    (m1a, c1, 'Penyisihan 1: Faperta vs Fahutan', 'finished', '2026-06-01 09:00:00', NULL, NULL),
    (m1b, c1, 'Penyisihan 2: FMIPA vs SV', 'finished', '2026-06-01 13:00:00', NULL, NULL),
    (m1c, c1, 'Grand Final Live Painting', 'upcoming', '2026-06-02 10:00:00', NULL, NULL),
    (m2a, c2, 'Semifinal 1: Teknik vs FPIK', 'finished', '2026-07-15 08:00:00', p2a, p2b),
    (m2b, c2, 'Semifinal 2: FEM vs FKH', 'finished', '2026-07-15 09:00:00', p2c, p2d),
    (m2c, c2, 'Final Kumite Putra', 'upcoming', '2026-07-15 15:00:00', p2a, p2d),
    (m3a, c3, 'Upper Bracket: Fasilkom vs Fateta', 'finished', '2026-08-20 10:00:00', p3a, p3b),
    (m3b, c3, 'Lower Bracket: SB vs Vokasi', 'finished', '2026-08-20 13:00:00', p3c, p3d),
    (m3c, c3, 'Grand Final E-Sports', 'upcoming', '2026-08-21 19:00:00', p3a, p3c);

    INSERT INTO match_participants (match_id, participant_id, position) VALUES
    (m1a, p1a, 1), (m1a, p1b, 2),
    (m1b, p1c, 1), (m1b, p1d, 2),
    (m1c, p1a, 1), (m1c, p1c, 2);
END $$;