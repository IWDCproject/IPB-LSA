# IPB Lucky Sport & Art — Schema
> Directus (port 7777) over PostgreSQL. All PKs `UUID`. All timestamps UTC. Directus manages its own tables — only custom tables are defined here.

---

## Architecture

```
Admin Dashboard (Next.js) --REST PATCH--► Directus --SQL--► PostgreSQL
Public Website (Next.js)  ◄--WS subscribe--
```

**Realtime pattern:** operator writes `live_state` via `PATCH /items/matches/{id}` → public display subscribes via WebSocket and receives updates automatically. Subscribe only to `fields: ["live_state"]` — never the full row.

---

## Data Hierarchy

```
directus_users (ormawa / superadmin)
└-- events
    ├-- competition_categories
    │   ├-- match_formats            ← scoring engine config, assigned to a category
    │   ├-- participants             ← athletes or teams
    │   └-- matches
    │       ├-- live_state           ← realtime JSONB state
    │       └-- match_participants[] ← junction table for open matches
    ├-- institutions                 ← universities / clubs, referenced by participants
    ├-- event_phases                 ← public event timeline
    └-- news                         ← articles tied to the event

activity_logs                        ← platform-wide audit trail
app_settings                         ← global config
```

---

## Directus-managed tables (do not create in SQL)

| Table | Notes |
|---|---|
| `directus_users` | Accounts. Custom field `organisation_name TEXT` added via Directus UI. |
| `directus_files` | Asset storage. `institutions.logo`, `events.card_image`, `events.banner_image`, `news.thumbnail` all store `UUID` referencing this table. Render via `GET /assets/<uuid>`. |
| `directus_revisions` | ⚠️ Disable for `matches` and `activity_logs` — see Setup. |

---

## Tables

> All tables except `activity_logs` and `match_participants` have an `updated_at` trigger. See Triggers section.

### `events`

```sql
CREATE TABLE events (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_created          UUID        NOT NULL REFERENCES directus_users(id),
  name                  TEXT        NOT NULL,
  slug                  TEXT        NOT NULL UNIQUE,
  type                  TEXT        NOT NULL CHECK (type IN ('sport', 'arts')),
  status                TEXT        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft','upcoming','active','finished','cancelled')),
  start_date            DATE,
  end_date              DATE,
  location              TEXT,
  description           TEXT,
  contact_person        JSONB,
  registration_url      TEXT,
  guidebook_url         TEXT,
  instagram_url         TEXT,
  website_url           TEXT,
  card_image            UUID        REFERENCES directus_files(id) ON DELETE SET NULL,
  banner_image          UUID        REFERENCES directus_files(id) ON DELETE SET NULL,
  is_published          BOOLEAN     NOT NULL DEFAULT false,
  is_registration_open  BOOLEAN     NOT NULL DEFAULT false,
  registration_end_date TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

---

### `competition_categories`

```sql
CREATE TABLE competition_categories (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  format_id        UUID    REFERENCES match_formats(id) ON DELETE SET NULL,
  name             TEXT    NOT NULL,
  participant_type TEXT    NOT NULL CHECK (participant_type IN ('individual', 'team')),
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

> `participant_type` = who competes (individual/team). `match_type` (on `match_formats`) = how the match is structured. These are orthogonal.
>
> | Example | match_type | participant_type |
> |---|---|---|
> | Kumite / Futsal | head_to_head | individual / team |
> | Kata solo | solo | individual |
> | Marathon / Hackathon | open | individual / team |

---

### `match_formats`

```sql
CREATE TABLE match_formats (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  match_type   TEXT    NOT NULL CHECK (match_type IN ('head_to_head', 'solo', 'open')),
  modules      JSONB   NOT NULL CHECK (jsonb_typeof(modules) = 'array'),
  created_by   UUID    REFERENCES directus_users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

#### `modules` structure

Array JSONB. First element = scoring engine (exactly one). Optional add-ons follow.

```json
[
  { "type": "score_timed", "config": { "score_label": "Poin", "has_periods": false } },
  { "type": "timer",       "config": { "mode": "countdown", "duration": 180 } },
  { "type": "notes",       "config": {} }
]
```

**Scoring engines:**

| Engine | match_type | Config fields |
|---|---|---|
| `score_timed` | head_to_head | `score_label`, `has_periods`, `period_term`, `period_count` |
| `score_sets` | head_to_head | `score_label`, `term`, `max_sets`, `sets_to_win` |
| `judge_scores` | solo | `num_judges`, `score_min`, `score_max`, `step`, `method` (`avg`\|`sum`\|`drop_extremes`) |
| `finish_time` | solo, open | `unit` (`s`\|`ms`), `rank_order` (`asc`\|`desc`) |
| `manual_pick` | head_to_head, open | `allow_draw`, `top_n`, `ranked_order` |

**Add-ons:**

| Add-on | Config | Notes |
|---|---|---|
| `timer` | `mode` (`countdown`\|`stopwatch`\|`deadline`), `duration` | `deadline` mode ignores `duration` — reads `timerTarget` ISO timestamp from `live_state` instead |
| `notes` | `{}` | Compatible with all engines |

---

### `institutions`

```sql
CREATE TABLE institutions (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  logo       UUID    REFERENCES directus_files(id) ON DELETE SET NULL, -- UUID, not URL. Use getAssetUrl(logo).
  color      TEXT,                                                       -- Hex: "#1A3D6E". null = theme default.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, LOWER(name))
);
```

---

### `participants`

```sql
CREATE TABLE participants (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_category_id UUID    NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  institution_id          UUID    REFERENCES institutions(id) ON DELETE SET NULL,
  name                    TEXT    NOT NULL,
  members                 JSONB,  -- team members array, not a separate table
  seed                    INTEGER,
  notes                   TEXT    DEFAULT '',
  custom_logo_url         TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
```

> ⚠️ FK column is named `institution_id`. Directus exposes this as `institution_id` in API responses — not `institution`. Use `institution_id.*` in field queries. Map to `institution` explicitly in the data layer:
> ```js
> const mapParticipant = (p) => p ? {
>   ...p,
>   institution: p.institution_id ? {
>     ...p.institution_id,
>     logo_url: getAssetUrl(p.institution_id?.logo),
>   } : null,
> } : null;
> ```

---

### `matches`

```sql
CREATE TABLE matches (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_category_id UUID    NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
  round                   TEXT,
  match_name              TEXT,
  venue                   TEXT,
  scheduled_at            TIMESTAMPTZ,
  home_participant_id     UUID    REFERENCES participants(id) ON DELETE SET NULL,
  away_participant_id     UUID    REFERENCES participants(id) ON DELETE SET NULL,
  CHECK (home_participant_id IS DISTINCT FROM away_participant_id),

  -- Results — do not write directly from app; managed by trigger on live_state
  winner                  TEXT,
  rankings                JSONB,

  -- Denormalised columns — managed by trigger, never write from app
  home_score              INTEGER DEFAULT 0,
  away_score              INTEGER DEFAULT 0,
  timer_secs              INTEGER DEFAULT 0,

  live_state              JSONB   NOT NULL DEFAULT '{}',
  status                  TEXT    NOT NULL DEFAULT 'upcoming'
                                  CHECK (status IN ('upcoming','live','finished','cancelled')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
```

---

### `match_participants`

Junction table for open matches.

```sql
CREATE TABLE match_participants (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_id UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (match_id, participant_id)
);
```

Directus field query for open match participants:
```
fields[]=participants.participant_id.id
fields[]=participants.participant_id.name
fields[]=participants.participant_id.institution_id.name
fields[]=participants.participant_id.institution_id.logo   ← UUID, apply getAssetUrl()
fields[]=participants.participant_id.institution_id.color
```

---

### `event_phases`

```sql
CREATE TABLE event_phases (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label         TEXT    NOT NULL,
  description   TEXT    DEFAULT '',
  date_start    DATE    NOT NULL,
  date_end      DATE,
  time_start    TIME    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('done', 'current', 'upcoming')),
  display_order INTEGER NOT NULL DEFAULT 0
);
```

---

### `news`

```sql
CREATE TABLE news (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID    NOT NULL REFERENCES directus_users(id),
  event_id     UUID    REFERENCES events(id) ON DELETE SET NULL,  -- SET NULL: article survives event deletion
  category     TEXT    NOT NULL CHECK (category IN ('announcement', 'result', 'news', 'update')),
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  excerpt      TEXT,
  thumbnail    UUID    REFERENCES directus_files(id) ON DELETE SET NULL, -- UUID asset, apply getAssetUrl()
  content      TEXT,   -- HTML. Rendered on web with Tailwind Typography (@tailwindcss/typography).
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

> Public route: `/news/[eventSlug]/[newsSlug]`. Visiting `/news/[eventSlug]/` redirects to `/events/[eventSlug]?tab=news`.

---

### `activity_logs`

```sql
CREATE TABLE activity_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID    REFERENCES events(id) ON DELETE SET NULL,
  user_id     UUID    NOT NULL REFERENCES directus_users(id),
  action      TEXT    NOT NULL,
  entity      TEXT    NOT NULL,
  entity_id   UUID,
  description TEXT    NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
  -- No updated_at — append-only
);
```

---

### `app_settings`

```sql
CREATE TABLE app_settings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   TEXT    NOT NULL UNIQUE,
  setting_value TEXT,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

| setting_key | Example |
|---|---|
| `site_name` | IPB Lucky Sports & Arts |
| `default_locale` | id |
| `public_base_url` | https://sport.ipb.ac.id |
| `registration_default_open` | false |

---

## `live_state` shape

### SPARSE JSON ARCHITECTURE:
live_state defaults to an empty object {} in the database. Keys are only added when an operator interacts with a specific module.
Rule for Frontend Clients: Never assume these keys exist. Always use default fallbacks when reading (e.g., const { homeScore = 0 } = liveState). Do not bloat the database by initializing unused engine keys.

```json
{
  "matchStatus": "upcoming | live | finished",
  "winner": null,
  "rankings": [],
  "notes": "",

  "timerSecs": 180,
  "timerTarget": "2026-04-18T10:00:00Z",
  "timerLastStarted": null,
  "timerRunning": false,
  "timerFlags": [],

  "homeScore": 0,
  "awayScore": 0,
  "periodIdx": 0,
  "periodPhase": "idle | active | halftime",

  "setIdx": 0,
  "setPhase": "idle | active | ending",
  "setScore": [0, 0],
  "setsWon": [0, 0],
  "setLog": [],
  "pendingSetWinner": null,

  "judgeScores": [],
  "timeLog": []
}
```

| Field | Engine | Notes |
|---|---|---|
| `matchStatus` | all | Current match status |
| `winner` | all | Set on finish; trigger syncs to `matches.winner` |
| `rankings` | manual_pick open | `[{ "rank": 1, "id": "uuid", "name": "Tim A" }]`; trigger syncs to `matches.rankings` |
| `notes` | notes add-on | Operator notes |
| `timerSecs` | timer | Snapshot at last operator interaction |
| `timerLastStarted` | timer | ISO timestamp of last Start press; null when stopped |
| `timerRunning` | timer | Whether timer is ticking |
| `timerTarget` | timer (deadline mode) | ISO timestamp; frontend counts down passively, no DB ticks |
| `timerFlags` | timer | `[{ "label": "Flag 1", "secs": 142.5 }]` |
| `homeScore` / `awayScore` | score_timed | Cumulative score |
| `periodIdx` / `periodPhase` | score_timed | Current period (0-based) and phase |
| `setIdx` / `setPhase` / `setScore` / `setsWon` / `setLog` | score_sets | Set state |
| `pendingSetWinner` | score_sets | Set winner awaiting confirmation |
| `judgeScores` | judge_scores | `[7.5, 8.2, 7.8, ...]` |
| `timeLog` | finish_time | `[{ "name": "Reza", "time": "10:42.3" }]` |

**Timer — never PATCH on every tick. Use snapshot + elapsed:**
```js
function calcCurrentSecs(live, timerCfg) {
  const isStop   = timerCfg?.mode === "stopwatch";
  const snapshot = Math.max(0, live.timerSecs ?? 0);
  if (!live.timerRunning || !live.timerLastStarted) return snapshot;
  const elapsed  = Math.max(0, (Date.now() - new Date(live.timerLastStarted).getTime()) / 1000);
  return isStop ? snapshot + elapsed : Math.max(0, snapshot - elapsed);
}
```

| Action | PATCH payload |
|---|---|
| Start | `{ timerRunning: true, timerLastStarted: now(), timerSecs: calcCurrentSecs() }` |
| Stop | `{ timerRunning: false, timerSecs: calcCurrentSecs(), timerLastStarted: null }` |
| Reset | `{ timerRunning: false, timerSecs: initSecs, timerLastStarted: null, timerFlags: [] }` |
| Flag | `{ timerFlags: [...flags, { label, secs: calcCurrentSecs() }] }` |
| End match | Include `timerRunning: false, timerSecs: calcCurrentSecs(), timerLastStarted: null` |

Edge cases: `timerLastStarted` null + `timerRunning: true` → treat as stopped. `elapsed > timerSecs` → clamp to 0 + PATCH stop. Clock skew (elapsed < 0) → clamp to 0. Never start a countdown already at 0.

---

## SQL: Triggers

### Denormalisation — `matches`

> ⚠️ Runs on UPDATE only, not INSERT. Run an explicit UPDATE after seed INSERTs to populate denorm columns.

```sql
CREATE OR REPLACE FUNCTION sync_match_denorm()
RETURNS trigger AS $$
BEGIN
  NEW.home_score  := COALESCE((NEW.live_state->>'homeScore')::int, 0);
  NEW.away_score  := COALESCE((NEW.live_state->>'awayScore')::int, 0);
  NEW.timer_secs  := COALESCE((NEW.live_state->>'timerSecs')::int, 0);
  NEW.winner      := NEW.live_state->>'winner';
  NEW.rankings    := CASE
    WHEN NEW.live_state ? 'rankings'
     AND jsonb_array_length(NEW.live_state->'rankings') > 0
    THEN NEW.live_state->'rankings'
    ELSE NULL
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_denorm
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION sync_match_denorm();
```

### `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON events              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON competition_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON match_formats       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON institutions        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON participants        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON matches             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON news                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON app_settings        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Indexes

```sql
CREATE UNIQUE INDEX idx_events_slug            ON events(slug);
CREATE INDEX        idx_events_user_created    ON events(user_created);
CREATE INDEX        idx_events_status          ON events(status);

CREATE INDEX        idx_categories_event       ON competition_categories(event_id);
CREATE INDEX        idx_formats_event          ON match_formats(event_id);
CREATE UNIQUE INDEX idx_inst_event_name        ON institutions(event_id, LOWER(name));

CREATE INDEX        idx_participants_category  ON participants(competition_category_id);
CREATE INDEX        idx_participants_institution ON participants(institution_id);

CREATE INDEX        idx_matches_category       ON matches(competition_category_id);
CREATE INDEX        idx_matches_status         ON matches(status);
CREATE INDEX        idx_matches_scheduled      ON matches(scheduled_at);
CREATE INDEX        idx_matches_home           ON matches(home_participant_id) WHERE home_participant_id IS NOT NULL;
CREATE INDEX        idx_matches_away           ON matches(away_participant_id) WHERE away_participant_id IS NOT NULL;
CREATE INDEX        idx_matches_winner         ON matches(winner)             WHERE winner IS NOT NULL;
CREATE INDEX        idx_matches_rankings       ON matches USING GIN (rankings) WHERE rankings IS NOT NULL;

CREATE INDEX        idx_match_participants_match       ON match_participants(match_id);
CREATE INDEX        idx_match_participants_participant ON match_participants(participant_id);

CREATE UNIQUE INDEX idx_news_slug              ON news(slug);
CREATE INDEX        idx_news_event             ON news(event_id)              WHERE event_id IS NOT NULL;
CREATE INDEX        idx_news_published         ON news(is_published, published_at);

CREATE INDEX        idx_logs_event             ON activity_logs(event_id)     WHERE event_id IS NOT NULL;
CREATE INDEX        idx_logs_user              ON activity_logs(user_id);
CREATE INDEX        idx_logs_entity            ON activity_logs(entity, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX        idx_logs_created           ON activity_logs(created_at DESC);
```

---

## Directus Setup

After first deploy:

**1. Create policies**
```http
POST /policies  { "name": "ormawa",      "app_access": true, "admin_access": false }
POST /policies  { "name": "superadmin",  "app_access": true, "admin_access": true  }
```
Get public policy UUID: `GET /policies` → find `name: "$t:public_label"`.

**2. Ormawa permissions** — repeat for each collection with `"user_created": { "_eq": "$CURRENT_USER" }` filter:
```http
POST /permissions { "policy": "<ormawa-id>", "collection": "events", "action": "read", "permissions": { "user_created": { "_eq": "$CURRENT_USER" } } }
```
For `match_participants`, traverse the ownership chain:
```http
POST /permissions { "policy": "<ormawa-id>", "collection": "match_participants", "action": "read",
  "permissions": { "match_id": { "competition_category_id": { "event_id": { "user_created": { "_eq": "$CURRENT_USER" } } } } } }
```

**3. Public policy** — READ only on `events`, `matches`, `match_participants`, `news`, `event_phases`, `participants`, `institutions`. No write.

**4. ⚠️ Disable revisions for `matches` and `activity_logs`** — timer ticks = 1 PATCH/sec → ~72k revision rows per day with 10 live matches:
```http
PATCH /collections/matches        { "meta": { "accountability": null } }
PATCH /collections/activity_logs  { "meta": { "accountability": null } }
```

**5. Environment variables**
```env
KEY=<random-64-char>
SECRET=<random-64-char>
DB_CLIENT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=ipblucky
DB_USER=directus
DB_PASSWORD=<strong>
WEBSOCKETS_ENABLED=true
WEBSOCKETS_HEARTBEAT_PERIOD=60
```

---

## Implementation Notes

**Asset fields** — `institutions.logo`, `events.card_image`, `events.banner_image`, `news.thumbnail` all return `UUID`, not URLs. Always convert: `getAssetUrl(uuid)` → `http://<DIRECTUS_URL>/assets/<uuid>`. Returns null if uuid is null.

**`finish_time` + `rankings`** — the `finish_time` engine writes to `live_state.timeLog`, not `live_state.rankings`. App must explicitly populate `live_state.rankings` from `timeLog` order before closing the match (trigger reads from `rankings`, not `timeLog`).

**Editing a live format** — `match_formats` can be assigned to multiple categories. If a format is edited while a match with `status = 'live'` uses it, the operator screen changes mid-match. Always check and warn.

**`_ftName` / `_ftTime` are UI state** — keep in React state, not DB. Only PATCH `live_state` when operator presses "Log Time".

**Timezone** — all timestamps stored as UTC. Display conversion to WIB (UTC+7) is frontend responsibility.