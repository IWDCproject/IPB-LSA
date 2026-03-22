-- File ini hanya sebagai referensi/dokumentasi bagaimana data awal dimasukkan.
-- Data di bawah ini sudah otomatis ter-include di dalam init_db.sql.
DO $$
DECLARE
    v_user_id uuid;
    
    e1 uuid := 'a1b2c3d4-0001-4000-8000-000000000001'; e2 uuid := 'a1b2c3d4-0002-4000-8000-000000000002'; e3 uuid := 'a1b2c3d4-0003-4000-8000-000000000003';
    
    c1 uuid := 'c1c1c1c1-0001-4000-8000-000000000001'; c2 uuid := 'c1c1c1c1-0002-4000-8000-000000000002'; c3 uuid := 'c1c1c1c1-0003-4000-8000-000000000003';
    
    p1a uuid := 'd1d1d1d1-0001-4000-8000-000000000001'; p1b uuid := 'd1d1d1d1-0002-4000-8000-000000000002'; p1c uuid := 'd1d1d1d1-0003-4000-8000-000000000003'; p1d uuid := 'd1d1d1d1-0004-4000-8000-000000000004';
    p2a uuid := 'd2d2d2d2-0001-4000-8000-000000000001'; p2b uuid := 'd2d2d2d2-0002-4000-8000-000000000002'; p2c uuid := 'd2d2d2d2-0003-4000-8000-000000000003'; p2d uuid := 'd2d2d2d2-0004-4000-8000-000000000004';
    p3a uuid := 'd3d3d3d3-0001-4000-8000-000000000001'; p3b uuid := 'd3d3d3d3-0002-4000-8000-000000000002'; p3c uuid := 'd3d3d3d3-0003-4000-8000-000000000003'; p3d uuid := 'd3d3d3d3-0004-4000-8000-000000000004';
    
    m1a uuid := 'e1e1e1e1-0001-4000-8000-000000000001'; m1b uuid := 'e1e1e1e1-0002-4000-8000-000000000002'; m1c uuid := 'e1e1e1e1-0003-4000-8000-000000000003';
    m2a uuid := 'e2e2e2e2-0001-4000-8000-000000000001'; m2b uuid := 'e2e2e2e2-0002-4000-8000-000000000002'; m2c uuid := 'e2e2e2e2-0003-4000-8000-000000000003';
    m3a uuid := 'e3e3e3e3-0001-4000-8000-000000000001'; m3b uuid := 'e3e3e3e3-0002-4000-8000-000000000002'; m3c uuid := 'e3e3e3e3-0003-4000-8000-000000000003';
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