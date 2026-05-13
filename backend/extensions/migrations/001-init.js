// Custom SQL that Directus schema snapshots cannot capture:
// - updated_at triggers
// - match denormalisation trigger
// - custom indexes

export async function up(knex) {
  // -- Functions ------------------------------------------------

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE OR REPLACE FUNCTION sync_match_denorm()
    RETURNS trigger AS $$
    BEGIN
      NEW.home_score  := COALESCE((NEW.live_state->>'homeScore')::int, 0);
      NEW.away_score  := COALESCE((NEW.live_state->>'awayScore')::int, 0);
      NEW.timer_secs  := COALESCE((NEW.live_state->>'timerSecs')::int, 0);
      NEW.winner      := NEW.live_state->>'winner';
      -- Nested CASE required: PostgreSQL does not guarantee short-circuit
      -- evaluation within a single WHEN A AND B, so jsonb_array_length can
      -- be called even when rankings is JSON null → "cannot get array length
      -- of a scalar". Outer WHEN confirms array type first; only then does
      -- the inner WHEN call jsonb_array_length.
      NEW.rankings := CASE
        WHEN jsonb_typeof(NEW.live_state->'rankings') = 'array'
        THEN CASE
          WHEN jsonb_array_length(NEW.live_state->'rankings') > 0
          THEN NEW.live_state->'rankings'
          ELSE NULL
        END
        ELSE NULL
      END;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // -- updated_at triggers --------------------------------------
  // Excluded: match_participants (no updated_at), activity_logs (append-only)

  const updatedAtTables = [
    'events',
    'competition_categories',
    'match_formats',
    'institutions',
    'participants',
    'matches',
    'news',
    'app_settings',
  ]

  for (const table of updatedAtTables) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_updated_at ON ${table};
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `)
  }

  // -- Match denorm trigger -------------------------------------

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_match_denorm ON matches;
    CREATE TRIGGER trg_match_denorm
      BEFORE UPDATE ON matches
      FOR EACH ROW EXECUTE FUNCTION sync_match_denorm();
  `)

  // -- Indexes --------------------------------------------------

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug         ON events(slug);
    CREATE        INDEX IF NOT EXISTS idx_events_user_created ON events(user_created);
    CREATE        INDEX IF NOT EXISTS idx_events_status       ON events(status);

    CREATE INDEX IF NOT EXISTS idx_categories_event           ON competition_categories(event_id);
    CREATE INDEX IF NOT EXISTS idx_formats_event              ON match_formats(event_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inst_event_name     ON institutions(event_id, LOWER(name));

    CREATE INDEX IF NOT EXISTS idx_participants_category      ON participants(competition_category_id);
    CREATE INDEX IF NOT EXISTS idx_participants_institution   ON participants(institution_id);

    CREATE        INDEX IF NOT EXISTS idx_matches_category    ON matches(competition_category_id);
    CREATE        INDEX IF NOT EXISTS idx_matches_status      ON matches(status);
    CREATE        INDEX IF NOT EXISTS idx_matches_scheduled   ON matches(scheduled_at);
    CREATE        INDEX IF NOT EXISTS idx_matches_home        ON matches(home_participant_id) WHERE home_participant_id IS NOT NULL;
    CREATE        INDEX IF NOT EXISTS idx_matches_away        ON matches(away_participant_id) WHERE away_participant_id IS NOT NULL;
    CREATE        INDEX IF NOT EXISTS idx_matches_winner      ON matches(winner)              WHERE winner IS NOT NULL;
    CREATE        INDEX IF NOT EXISTS idx_matches_rankings    ON matches USING GIN (rankings)  WHERE rankings IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_match_participants_match       ON match_participants(match_id);
    CREATE INDEX IF NOT EXISTS idx_match_participants_participant ON match_participants(participant_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_news_slug           ON news(slug);
    CREATE        INDEX IF NOT EXISTS idx_news_event          ON news(event_id)              WHERE event_id IS NOT NULL;
    CREATE        INDEX IF NOT EXISTS idx_news_published      ON news(is_published, published_at);

    CREATE INDEX IF NOT EXISTS idx_logs_event                 ON activity_logs(event_id)     WHERE event_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_logs_user                  ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_entity                ON activity_logs(entity, entity_id) WHERE entity_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_logs_created               ON activity_logs(created_at DESC);
  `)
}

export async function down(knex) {
  // Indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_events_slug;
    DROP INDEX IF EXISTS idx_events_user_created;
    DROP INDEX IF EXISTS idx_events_status;
    DROP INDEX IF EXISTS idx_categories_event;
    DROP INDEX IF EXISTS idx_formats_event;
    DROP INDEX IF EXISTS idx_inst_event_name;
    DROP INDEX IF EXISTS idx_participants_category;
    DROP INDEX IF EXISTS idx_participants_institution;
    DROP INDEX IF EXISTS idx_matches_category;
    DROP INDEX IF EXISTS idx_matches_status;
    DROP INDEX IF EXISTS idx_matches_scheduled;
    DROP INDEX IF EXISTS idx_matches_home;
    DROP INDEX IF EXISTS idx_matches_away;
    DROP INDEX IF EXISTS idx_matches_winner;
    DROP INDEX IF EXISTS idx_matches_rankings;
    DROP INDEX IF EXISTS idx_match_participants_match;
    DROP INDEX IF EXISTS idx_match_participants_participant;
    DROP INDEX IF EXISTS idx_news_slug;
    DROP INDEX IF EXISTS idx_news_event;
    DROP INDEX IF EXISTS idx_news_published;
    DROP INDEX IF EXISTS idx_logs_event;
    DROP INDEX IF EXISTS idx_logs_user;
    DROP INDEX IF EXISTS idx_logs_entity;
    DROP INDEX IF EXISTS idx_logs_created;
  `)

  // Triggers
  const updatedAtTables = [
    'events', 'competition_categories', 'match_formats',
    'institutions', 'participants', 'matches', 'news', 'app_settings',
  ]
  for (const table of updatedAtTables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_updated_at ON ${table};`)
  }
  await knex.raw(`DROP TRIGGER IF EXISTS trg_match_denorm ON matches;`)

  // Functions
  await knex.raw(`DROP FUNCTION IF EXISTS sync_match_denorm;`)
  await knex.raw(`DROP FUNCTION IF EXISTS set_updated_at;`)
}