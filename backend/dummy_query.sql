DO $$
DECLARE
    v_user_id uuid;
    -- Event IDs
    e1 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000001';
    e2 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000002';
    e3 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000003';

    -- Institution IDs
    i_ipb uuid := 'b1b1b1b1-b1b1-4000-9999-000000000001';
    i_upn uuid := 'b1b1b1b1-b1b1-4000-9999-000000000002';
    i_ui  uuid := 'b1b1b1b1-b1b1-4000-9999-000000000003';

    -- Category IDs
    c1 uuid := 'c2c2c2c2-c2c2-4000-b222-000000000001';
    c2 uuid := 'c2c2c2c2-c2c2-4000-b222-000000000002';
    c3 uuid := 'c2c2c2c2-c2c2-4000-b222-000000000003';

    -- Participant IDs
    p1 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000001';
    p2 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000002';
    p3 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000003';
    p4 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000004';
    p5 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000005';
    p6 uuid := 'd3d3d3d3-d3d3-4000-c333-000000000006';
BEGIN
    SELECT id INTO v_user_id FROM directus_users LIMIT 1;

    -- 0. HAPUS DATA LAMA (Urutan dari yang paling banyak foreign key ke yang paling sedikit)
    -- TRUNCATE dengan CASCADE akan menghapus semua data di tabel yang saling berhubungan
    TRUNCATE TABLE matches, match_participants, participants, institutions, competition_categories, events CASCADE;

    -- 1. INSERT EVENTS (Harus paling awal)
    INSERT INTO events (id, user_created, created_at, name, slug, type, status, is_published, start_date, location, card_image_url) VALUES
    (e1, v_user_id, now(), 'FORKI X IPB CUP 2026', 'forki-ipb-2026', 'sport', 'active', true, '2026-03-25', 'Gymnasium IPB', 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=1000'),
    (e2, v_user_id, now(), 'IT-TODAY HACKTODAY', 'hacktoday-2026', 'sport', 'active', true, '2026-03-26', 'Auditorium AHN', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000'),
    (e3, v_user_id, now(), 'IPB BERLARI 2026', 'ipb-berlari-2026', 'sport', 'active', true, '2026-03-27', 'Lingkar IPB', 'https://www.sunlife.co.id/content/dam/sunlife/legacy/assets/id/Life%20Moments/Building%20a%20Family/Berlari%20Menyehatkan%20Tubuh%20dan%20Pikiran-1200x600.jpg');

    -- 2. INSERT INSTITUTIONS
    INSERT INTO institutions (id, event_id, name, logo_url) VALUES
    (i_ipb, e1, 'IPB University', '/universities/ipb.png'),
    (i_upn, e1, 'UPNVYK', '/universities/ui.png'),
    (i_ui, e1, 'UI', '/universities/ui.png');

    -- 3. INSERT CATEGORIES
    INSERT INTO competition_categories (id, event_id, name, participant_type) VALUES
    (c1, e1, 'Kata Perorang', 'individual'),
    (c2, e2, 'Hackathon', 'team'),
    (c3, e3, 'Open Marathon', 'individual');

    -- 4. INSERT PARTICIPANTS
    INSERT INTO participants (id, competition_category_id, institution_id, name) VALUES
    (p1, c1, i_ipb, 'Gilang Muhamad'),
    (p2, c1, i_upn, 'Agus Maragus'),
    (p3, c2, i_ipb, 'Team IPB 1'),
    (p4, c2, i_ui,  'Team UI 2'),
    (p5, c3, i_ipb, 'Reza Rahardian'),
    (p6, c3, i_ipb, 'Gilang Muhamad');

    -- 5. INSERT MATCHES
    INSERT INTO matches (id, competition_category_id, match_name, status, scheduled_at, venue, round, home_participant_id, away_participant_id, live_state) VALUES
    ('f4f4f4f4-f4f4-4000-d444-000000000001', c1, 'Kata Perorang', 'live', now(), 'Lapangan B Gor Utama', 'Final', p1, p2, '{"homeScore": 3, "awayScore": 4, "timerSecs": 272, "timerRunning": true}'),
    ('f4f4f4f4-f4f4-4000-d444-000000000002', c2, 'HackToday', 'live', now(), 'Auditorium AHN', 'Main Event', p3, p4, '{"timerSecs": 1800, "timerRunning": true}'),
    ('f4f4f4f4-f4f4-4000-d444-000000000003', c1, 'Kata Perorang', 'upcoming', now() + interval '1 hour', 'Lapangan B', 'Semifinal', p1, p2, '{}'),
    ('f4f4f4f4-f4f4-4000-d444-000000000004', c3, 'Open Marathon', 'live', now(), 'Lingkar IPB', 'Final', p5, NULL, '{"timerSecs": 3600, "timerRunning": true}');

    RAISE NOTICE 'Data dummy berhasil diperbarui dengan urutan yang benar!';
END $$;