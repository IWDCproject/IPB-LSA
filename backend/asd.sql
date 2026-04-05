-- ─────────────────────────────────────────────────────────────────────────────
-- ADDITIVE SEED: score_sets match format
-- Run this AFTER the main seed. Does not truncate any existing data.
-- Adds: IPB Badminton Cup 2026 (e6) with Tunggal Putra category.
-- Match coverage:
--   mb1 — Semifinal 1  : finished, straight sets  2-0  (21-14, 21-17)
--   mb2 — Semifinal 2  : finished, rubber set      2-1  (21-16, 18-21, 17-21)
--   mb3 — Final        : LIVE, home leads set 2  15-12  (won set 1 21-19)
--   mb4 — 3rd place    : upcoming
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_user_id uuid;

    -- Event
    e6 uuid := 'e1e1e1e1-e1e1-4000-a111-000000000006';

    -- Institutions (scoped to e6)
    i6_ipb uuid := 'b6000006-b600-4000-9999-000000000001';
    i6_ui  uuid := 'b6000006-b600-4000-9999-000000000002';
    i6_itb uuid := 'b6000006-b600-4000-9999-000000000003';
    i6_ugm uuid := 'b6000006-b600-4000-9999-000000000004';

    -- Match format
    f6_sets uuid := 'f6000006-f600-4000-e555-000000000001';

    -- Category
    c6_tunggal_pa uuid := 'c6000006-c600-4000-b222-000000000001';

    -- Participants
    pb1 uuid := 'e0000001-e000-4000-f666-000000000001'; -- Dimas  (IPB, seed 1)
    pb2 uuid := 'e0000001-e000-4000-f666-000000000002'; -- Fadhil (UI,  seed 2)
    pb3 uuid := 'e0000001-e000-4000-f666-000000000003'; -- Guntur (ITB, seed 3)
    pb4 uuid := 'e0000001-e000-4000-f666-000000000004'; -- Handoko(UGM, seed 4)

    -- Matches
    mb1 uuid := 'a0000001-a000-4000-e777-000000000001'; -- SF1    finished
    mb2 uuid := 'a0000001-a000-4000-e777-000000000002'; -- SF2    finished
    mb3 uuid := 'a0000001-a000-4000-e777-000000000003'; -- Final  live
    mb4 uuid := 'a0000001-a000-4000-e777-000000000004'; -- 3rd    upcoming

BEGIN
    SELECT id INTO v_user_id FROM directus_users LIMIT 1;

    -- ── 1. EVENT ──────────────────────────────────────────────────────────────
    INSERT INTO events (
        id, user_created, name, slug, type, status,
        is_published, is_registration_open,
        start_date, end_date, location, description, contact_person
    ) VALUES (
        e6, v_user_id,
        'IPB BADMINTON CUP 2026', 'ipb-badminton-2026', 'sport', 'active',
        true, false,
        '2026-04-05', '2026-04-06',
        'GOR Badminton IPB, Bogor',
        'Turnamen bulutangkis antar perguruan tinggi se-Jawa Barat. Format gugur untuk kategori tunggal putra dan putri.',
        '{"name":"Adi Wijaya","phone":"086789012345","email":"badminton@ipb.ac.id"}'
    );

    -- ── 2. EVENT PHASES ───────────────────────────────────────────────────────
    INSERT INTO event_phases (event_id, label, description, date_start, time_start, status, display_order) VALUES
    (e6, 'Babak Penyisihan', 'Fase grup semua kategori',             '2026-04-05', '08:00', 'done',    1),
    (e6, 'Semifinal',        'Babak empat besar',                    '2026-04-05', '13:00', 'done',    2),
    (e6, 'Final & Posisi 3', 'Babak final dan perebutan posisi 3',   '2026-04-06', '09:00', 'current', 3);

    -- ── 3. MATCH FORMAT — score_sets ──────────────────────────────────────────
    -- Best of 3, first to 2 sets, 21-point rally scoring.
    -- No timer add-on (badminton is not timed).
    INSERT INTO match_formats (id, event_id, name, match_type, modules, created_by) VALUES
    (
        f6_sets, e6,
        'Badminton Sets Format', 'head_to_head',
        '[
            {"type":"score_sets","config":{"score_label":"Poin","term":"Set","max_sets":3,"sets_to_win":2}},
            {"type":"notes","config":{}}
        ]',
        v_user_id
    );

    -- ── 4. COMPETITION CATEGORY ───────────────────────────────────────────────
    INSERT INTO competition_categories (id, event_id, format_id, name, participant_type, display_order) VALUES
    (c6_tunggal_pa, e6, f6_sets, 'Tunggal Putra', 'individual', 1);

    -- ── 5. INSTITUTIONS ───────────────────────────────────────────────────────
    INSERT INTO institutions (id, event_id, name) VALUES
    (i6_ipb, e6, 'IPB University'),
    (i6_ui,  e6, 'Universitas Indonesia'),
    (i6_itb, e6, 'Institut Teknologi Bandung'),
    (i6_ugm, e6, 'Universitas Gadjah Mada');

    -- ── 6. PARTICIPANTS ───────────────────────────────────────────────────────
    INSERT INTO participants (id, competition_category_id, institution_id, name, seed) VALUES
    (pb1, c6_tunggal_pa, i6_ipb, 'Dimas Prayoga',  1),
    (pb2, c6_tunggal_pa, i6_ui,  'Fadhil Akbar',   2),
    (pb3, c6_tunggal_pa, i6_itb, 'Guntur Wibowo',  3),
    (pb4, c6_tunggal_pa, i6_ugm, 'Handoko Satria', 4);

    -- ── 7. MATCHES ────────────────────────────────────────────────────────────

    INSERT INTO matches (
        id, competition_category_id, round, match_name, venue,
        scheduled_at, status, home_participant_id, away_participant_id, live_state
    ) VALUES

    -- ── SF1: finished — Dimas (IPB) def. Guntur (ITB) 2-0 ────────────────────
    -- Straight sets. No rubber set. winner = "home".
    (mb1, c6_tunggal_pa, 'Semifinal', 'Tunggal Putra — Semifinal 1', 'Lapangan 1',
     now() - interval '3 hours', 'finished', pb1, pb3,
     '{
         "matchStatus": "finished",
         "winner":      "home",
         "setIdx":       1,
         "setPhase":    "idle",
         "setScore":    [0, 0],
         "setsWon":     [2, 0],
         "setLog": [
             {"label": "Set 1", "home": 21, "away": 14, "winner": "home"},
             {"label": "Set 2", "home": 21, "away": 17, "winner": "home"}
         ],
         "pendingSetWinner": null,
         "notes": "Dimas mendominasi dengan smash akurat di kedua set"
     }'::jsonb),

    -- ── SF2: finished — Fadhil (UI) vs Handoko (UGM), rubber set, away wins ──
    -- Home wins set 1, away wins sets 2 & 3. winner = "away".
    (mb2, c6_tunggal_pa, 'Semifinal', 'Tunggal Putra — Semifinal 2', 'Lapangan 2',
     now() - interval '2 hours', 'finished', pb2, pb4,
     '{
         "matchStatus": "finished",
         "winner":      "away",
         "setIdx":       2,
         "setPhase":    "idle",
         "setScore":    [0, 0],
         "setsWon":     [1, 2],
         "setLog": [
             {"label": "Set 1", "home": 21, "away": 16, "winner": "home"},
             {"label": "Set 2", "home": 18, "away": 21, "winner": "away"},
             {"label": "Set 3", "home": 17, "away": 21, "winner": "away"}
         ],
         "pendingSetWinner": null,
         "notes": "Pertandingan sengit tiga set — Handoko balik dari defisit"
     }'::jsonb),

    -- ── Final: LIVE — Dimas (IPB) vs Handoko (UGM) ───────────────────────────
    -- Set 1 closed (home 21-19). Now mid-set 2, home leads 15-12.
    -- setIdx = 1 (0-based second set), setPhase = "active".
    -- pendingSetWinner is null — no set has just ended.
    (mb3, c6_tunggal_pa, 'Final', 'Tunggal Putra — Final', 'Lapangan 1',
     now() - interval '40 minutes', 'live', pb1, pb4,
     '{
         "matchStatus": "live",
         "setIdx":       1,
         "setPhase":    "active",
         "setScore":    [15, 12],
         "setsWon":     [1, 0],
         "setLog": [
             {"label": "Set 1", "home": 21, "away": 19, "winner": "home"}
         ],
         "pendingSetWinner": null,
         "notes": "Dimas unggul 15-12 di Set 2, perlu 1 set lagi untuk juara"
     }'::jsonb),

    -- ── Perebutan Posisi 3: upcoming — Fadhil (UI) vs Guntur (ITB) ───────────
    (mb4, c6_tunggal_pa, 'Perebutan Posisi 3', 'Tunggal Putra — Posisi 3', 'Lapangan 2',
     now() + interval '30 minutes', 'upcoming', pb2, pb3,
     '{
         "matchStatus": "upcoming",
         "setIdx":       0,
         "setPhase":    "idle",
         "setScore":    [0, 0],
         "setsWon":     [0, 0],
         "setLog":      [],
         "pendingSetWinner": null
     }'::jsonb);

    -- ── 8. SYNC DENORMALIZED COLUMNS ──────────────────────────────────────────
    -- Trigger only fires on UPDATE, not INSERT — run this manually.
    -- home_score / away_score stay 0 for set-based matches (no homeScore key
    -- in live_state). winner and rankings are the relevant denorm columns.
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
    WHERE id IN (mb1, mb2, mb3, mb4);

    -- ── 9. NEWS ───────────────────────────────────────────────────────────────
    INSERT INTO news (author_id, event_id, category, title, slug, excerpt, content, is_published, published_at) VALUES

    (v_user_id, e6, 'announcement',
     'IPB Badminton Cup 2026 Memasuki Babak Final',
     'ipb-badminton-2026-final',
     'Dimas Prayoga dari IPB akan menghadapi Handoko Satria dari UGM di babak final Tunggal Putra.',
     'Babak semifinal IPB Badminton Cup 2026 telah selesai. Dimas Prayoga (IPB) melaju ke final setelah mengalahkan Guntur Wibowo (ITB) dua set langsung, 21-14 dan 21-17.'
     || E'\n\n'
     || 'Di semifinal lain, Handoko Satria (UGM) membalikkan situasi setelah kalah di set pertama, mengalahkan Fadhil Akbar (UI) tiga set dengan skor akhir 16-21, 21-18, 21-17.'
     || E'\n\n'
     || 'Final dimulai hari ini dan saat ini sedang berlangsung.',
     true, now() - interval '20 minutes');

    RAISE NOTICE '✓ IPB Badminton Cup added: event e6, format score_sets (BO3), 4 peserta, 2 SF selesai, 1 final live (set 2 berjalan), 1 posisi 3 upcoming.';
END $$;