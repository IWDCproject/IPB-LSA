/**
 * IPB-LSA Match Simulator
 *
 * Simulates live match progression for all scoring engines by PATCHing
 * live_state via the Directus REST API. Use this to test the WebSocket
 * pipeline end-to-end without a real operator dashboard.
 *
 * Usage:
 *   node simulate-match.mjs --event <slug>       simulate all upcoming matches for event
 *   node simulate-match.mjs --match <id>         simulate a single match by ID
 *   node simulate-match.mjs --event <slug> --one simulate one random upcoming match
 *
 * Environment (optional — defaults to seeder values):
 *   DIRECTUS_URL    (default: http://localhost:7777)
 *   DIRECTUS_TOKEN  (default: seeder admin token)
 *
 * Engines covered:
 *   score_timed   — homeScore/awayScore with optional periods + timer
 *   score_sets    — set-by-set play up to sets_to_win
 *   judge_scores  — judges reveal scores one by one
 *   finish_time   — participants finish at staggered times, rankings built
 *   manual_pick   — rankings revealed from last place to first (dramatic)
 */

import {
  createDirectus, rest, staticToken,
  readItems, updateItem,
} from '@directus/sdk';

// ─── Config ───────────────────────────────────────────────────────────────────

const DIRECTUS_URL = process.env.DIRECTUS_URL   ?? 'http://localhost:7777';
const TOKEN        = process.env.DIRECTUS_TOKEN ?? 'ECH98IbvMYhkTbPM2sYWKsjeib3Bpgo2';

const client = createDirectus(DIRECTUS_URL).with(rest()).with(staticToken(TOKEN));

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep      = (ms)       => new Promise(r => setTimeout(r, ms));
const randomInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (bias = 0.5) => Math.random() < bias;
const now        = ()         => new Date().toISOString();

const fmtTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

/** Parse CLI args into a plain object: --event foo → { event: 'foo' } */
const args = (() => {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const key = a[i].slice(2);
      out[key] = (a[i + 1] && !a[i + 1].startsWith('--')) ? a[++i] : true;
    }
  }
  return out;
})();

// ─── Directus helpers ─────────────────────────────────────────────────────────

/**
 * PATCH both status and the full live_state in one request.
 * Always sends live_state as a complete object — Directus replaces the JSONB
 * field entirely, so partial sends would lose existing fields.
 */
async function patch(matchId, live, status = undefined) {
  const payload = { live_state: live };
  if (status) payload.status = status;
  await client.request(updateItem('matches', matchId, payload));
}

const MATCH_FIELDS = [
  'id', 'status',
  'home_participant_id.id',
  'home_participant_id.name',
  'away_participant_id.id',
  'away_participant_id.name',
  'competition_category_id.format_id.modules',
  'competition_category_id.format_id.match_type',
  'participants.participant_id.id',
  'participants.participant_id.name',
  'participants.position',
];

// ─── Engine simulators ────────────────────────────────────────────────────────

/**
 * score_timed — increment homeScore/awayScore point by point.
 * Supports optional periods and a timer add-on.
 */
async function simScoreTimed(match, engineCfg, modules) {
  const {
    has_periods  = false,
    period_count = 2,
    period_term  = 'Period',
  } = engineCfg;

  const timerMod = modules.find(m => m.type === 'timer');
  const timerCfg = timerMod?.config ?? {};
  const initSecs = timerCfg.duration ?? 180;
  const periods  = has_periods ? period_count : 1;

  let live = {
    matchStatus: 'live',
    homeScore: 0, awayScore: 0,
    periodIdx: 0, periodPhase: 'active',
  };

  if (timerMod) {
    live = { ...live, timerRunning: true, timerLastStarted: now(), timerSecs: initSecs };
  }

  await patch(match.id, live, 'live');
  console.log(`    ▶ started (${periods} ${period_term}(s)${timerMod ? ', timer running' : ''})`);

  let timerSecsRemaining = initSecs;

  for (let p = 0; p < periods; p++) {
    if (p > 0) {
      // Resume timer for new period
      if (timerMod) {
        live = { ...live, timerRunning: true, timerLastStarted: now(), timerSecs: timerSecsRemaining };
      }
      live = { ...live, periodIdx: p, periodPhase: 'active' };
      await patch(match.id, live);
    }

    const points = randomInt(6, 14);
    const homeAdvantage = randomBool(0.52); // slight home bias

    for (let i = 0; i < points; i++) {
      await sleep(randomInt(200, 400));
      if (randomBool(homeAdvantage ? 0.55 : 0.45)) live.homeScore++;
      else live.awayScore++;
      await patch(match.id, live);
    }

    if (p < periods - 1) {
      // Halftime/period break
      if (timerMod) {
        timerSecsRemaining = Math.max(0, timerSecsRemaining - randomInt(60, 90));
        live = { ...live, timerRunning: false, timerSecs: timerSecsRemaining, timerLastStarted: null };
      }
      live = { ...live, periodPhase: 'halftime' };
      await patch(match.id, live);
      console.log(`    ⏸  ${period_term} ${p + 1} break — score ${live.homeScore}-${live.awayScore}`);
      await sleep(600);
    }
  }

  // Determine winner
  const winner = live.homeScore > live.awayScore
    ? (match.home?.id ?? null)
    : live.awayScore > live.homeScore
      ? (match.away?.id ?? null)
      : null; // draw

  if (timerMod) {
    live = { ...live, timerRunning: false, timerSecs: 0, timerLastStarted: null };
  }
  live = { ...live, matchStatus: 'finished', periodPhase: 'finished', winner };
  await patch(match.id, live, 'finished');

  console.log(`    ✅ final: ${live.homeScore}-${live.awayScore}${winner ? '' : ' (draw)'}`);
}

/**
 * score_sets — simulate point-by-point within each set.
 * Set ends when one side reaches target score with a 2-point lead (cap at 30).
 */
async function simScoreSets(match, engineCfg) {
  const { sets_to_win = 2, max_sets = 3 } = engineCfg;

  let live = {
    matchStatus: 'live',
    setIdx: 0, setPhase: 'active',
    setScore: [0, 0], setsWon: [0, 0], setLog: [],
  };
  await patch(match.id, live, 'live');
  console.log(`    ▶ started (first to ${sets_to_win} sets)`);

  let homeSets = 0, awaySets = 0;

  while (homeSets < sets_to_win && awaySets < sets_to_win) {
    let hp = 0, ap = 0;
    const setNum = live.setIdx + 1;

    // Simulate points within this set
    while (true) {
      await sleep(randomInt(120, 300));
      randomBool(0.5) ? hp++ : ap++;

      live = { ...live, setScore: [hp, ap] };
      await patch(match.id, live);

      // Win condition: ≥21 with 2-point lead, or first to 30
      const gap = Math.abs(hp - ap);
      const won = (Math.max(hp, ap) >= 21 && gap >= 2) || Math.max(hp, ap) >= 30;
      if (won) {
        if (hp > ap) homeSets++; else awaySets++;
        const log = [...live.setLog, { home: hp, away: ap }];
        live = {
          ...live,
          setPhase: 'ending',
          setsWon: [homeSets, awaySets],
          setLog: log,
        };
        await patch(match.id, live);
        console.log(`    📊 set ${setNum}: ${hp}-${ap} → sets ${homeSets}-${awaySets}`);
        await sleep(500);

        // Start next set
        live = { ...live, setIdx: live.setIdx + 1, setPhase: 'active', setScore: [0, 0] };
        break;
      }
    }
  }

  const winner = homeSets > awaySets ? (match.home?.id ?? null) : (match.away?.id ?? null);
  live = { ...live, matchStatus: 'finished', setPhase: 'finished', winner };
  await patch(match.id, live, 'finished');

  console.log(`    ✅ final sets: ${homeSets}-${awaySets}, winner: ${winner ? (homeSets > awaySets ? match.home?.name : match.away?.name) : '?'}`);
}

/**
 * judge_scores — each judge reveals their score one by one.
 */
async function simJudgeScores(match, engineCfg) {
  const { num_judges = 3, score_min = 0, score_max = 10, step = 0.1 } = engineCfg;

  let live = { matchStatus: 'live', judgeScores: [] };
  await patch(match.id, live, 'live');
  console.log(`    ▶ started (${num_judges} judges, ${score_min}–${score_max})`);

  const scores = [];
  for (let i = 0; i < num_judges; i++) {
    await sleep(randomInt(600, 1200));
    // Skew scores toward the upper range (more exciting)
    const raw   = score_min + Math.random() ** 0.6 * (score_max - score_min);
    const score = parseFloat((Math.round(raw / step) * step).toFixed(2));
    scores.push(score);
    live = { ...live, judgeScores: [...scores] };
    await patch(match.id, live);
    console.log(`    👩‍⚖️  judge ${i + 1}: ${score}`);
  }

  // For solo matches the winner is the participant themselves (home slot)
  const winner = match.home?.id ?? null;
  live = { ...live, matchStatus: 'finished', winner };
  await patch(match.id, live, 'finished');

  const total = scores.reduce((s, v) => s + v, 0);
  console.log(`    ✅ scores: [${scores.join(', ')}] total=${total.toFixed(2)}`);
}

/**
 * finish_time — participants cross the finish line at staggered times.
 * Builds rankings from timeLog order, then PATCHes rankings so the DB
 * trigger can sync winner.
 */
async function simFinishTime(match, engineCfg, participants) {
  const { unit = 's', rank_order = 'asc' } = engineCfg;

  let live = { matchStatus: 'live', timeLog: [] };
  await patch(match.id, live, 'live');
  console.log(`    ▶ started (${participants.length} participants, unit=${unit})`);

  // Randomise finish order
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // Starting base time — realistic range per unit
  let baseTime = unit === 'ms'
    ? randomInt(60_000, 120_000)  // 1–2 min in ms
    : randomInt(600, 7_200);      // 10 min–2 hr in seconds

  const timeLog = [];
  for (const p of shuffled) {
    await sleep(randomInt(300, 700));
    const gap = unit === 'ms' ? randomInt(500, 8_000) : randomInt(5, 300);
    baseTime += gap;

    const time = unit === 'ms'
      ? `${Math.floor(baseTime / 60000)}:${String(Math.floor((baseTime % 60000) / 1000)).padStart(2, '0')}.${String(baseTime % 1000).padStart(3, '0')}`
      : fmtTime(baseTime);

    timeLog.push({ name: p.name, participant_id: p.id, time });
    live = { ...live, timeLog: [...timeLog] };
    await patch(match.id, live);
    console.log(`    🏁 ${p.name}: ${time}`);
  }

  // Build rankings — timeLog is already in arrival order (ascending finish time)
  const ordered = rank_order === 'asc' ? timeLog : [...timeLog].reverse();
  const rankings = ordered.map((entry, i) => ({
    rank: i + 1,
    id:   entry.participant_id,
    name: entry.name,
  }));
  const winner = rankings[0]?.id ?? null;

  live = { ...live, matchStatus: 'finished', rankings, winner };
  await patch(match.id, live, 'finished');
  console.log(`    ✅ winner: ${rankings[0]?.name}`);
}

/**
 * manual_pick — operator picks final rankings.
 * Simulates the dramatic reveal: reveals from last place upward.
 */
async function simManualPick(match, engineCfg, participants) {
  const { top_n = 3 } = engineCfg;

  let live = { matchStatus: 'live', rankings: [] };
  await patch(match.id, live, 'live');
  console.log(`    ▶ started (picking top ${top_n} from ${participants.length} participants)`);

  await sleep(800);

  // Shuffle and slice to top_n
  const shuffled = [...participants].sort(() => Math.random() - 0.5).slice(0, top_n);

  // Assign ranks 1..top_n
  const finalRankings = shuffled.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name }));

  // Reveal from last place to first (lowest rank → highest)
  const revealed = [];
  for (const entry of [...finalRankings].reverse()) {
    await sleep(randomInt(600, 1000));
    revealed.unshift(entry);
    live = { ...live, rankings: [...revealed] };
    await patch(match.id, live);
    console.log(`    🏆 rank ${entry.rank}: ${entry.name}`);
  }

  const winner = finalRankings[0]?.id ?? null;
  live = { ...live, matchStatus: 'finished', winner };
  await patch(match.id, live, 'finished');
  console.log(`    ✅ winner: ${finalRankings[0]?.name}`);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Normalise a raw Directus match row into the shape the sim functions expect.
 */
function normalise(raw) {
  const modules = raw.competition_category_id?.format_id?.modules ?? [];
  let parsed = modules;
  if (typeof modules === 'string') {
    try { parsed = JSON.parse(modules); } catch { parsed = []; }
  }

  // Gather participants: open match uses junction table, h2h uses home/away slots
  const junctionParts = (raw.participants ?? [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(j => ({ id: j.participant_id?.id, name: j.participant_id?.name }))
    .filter(p => p.id);

  const homeObj = raw.home_participant_id;
  const awayObj = raw.away_participant_id;

  const h2hParts = [homeObj, awayObj]
    .filter(Boolean)
    .map(p => ({ id: p.id, name: p.name }));

  return {
    id:           raw.id,
    home:         homeObj ? { id: homeObj.id, name: homeObj.name } : null,
    away:         awayObj ? { id: awayObj.id, name: awayObj.name } : null,
    participants: junctionParts.length ? junctionParts : h2hParts,
    modules:      parsed,
  };
}

async function simulate(raw) {
  const match   = normalise(raw);
  const modules = match.modules;

  if (!modules.length) {
    console.warn(`  ⚠️  match ${match.id} has no format modules — skipping`);
    return;
  }

  const engine    = modules[0];
  const engineCfg = engine.config ?? {};
  const label     = match.home
    ? `${match.home.name} vs ${match.away?.name ?? '?'}`
    : `${match.participants.length} participants`;

  console.log(`\n  ▸ [${engine.type}] ${label}`);
  console.log(`    match id: ${match.id}`);

  switch (engine.type) {
    case 'score_timed':
      return simScoreTimed(match, engineCfg, modules);
    case 'score_sets':
      return simScoreSets(match, engineCfg);
    case 'judge_scores':
      return simJudgeScores(match, engineCfg);
    case 'finish_time':
      return simFinishTime(match, engineCfg, match.participants);
    case 'manual_pick':
      return simManualPick(match, engineCfg, match.participants);
    default:
      console.warn(`    ⚠️  unknown engine "${engine.type}" — skipping`);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const { event: eventSlug, match: matchId, one } = args;

  if (!eventSlug && !matchId) {
    console.error('Usage:');
    console.error('  node simulate-match.mjs --event <slug>');
    console.error('  node simulate-match.mjs --event <slug> --one');
    console.error('  node simulate-match.mjs --match <id>');
    process.exit(1);
  }

  console.log('🎮  IPB-LSA Match Simulator');
  console.log(`    Directus: ${DIRECTUS_URL}\n`);

  let rows;

  if (matchId) {
    rows = await client.request(readItems('matches', {
      filter: { id: { _eq: matchId } },
      fields: MATCH_FIELDS,
      limit:  1,
    }));
  } else {
    console.log(`    Event: ${eventSlug}`);
    rows = await client.request(readItems('matches', {
      filter: {
        status: { _in: ['upcoming', 'live'] },
        competition_category_id: { event_id: { slug: { _eq: eventSlug } } },
      },
      fields: MATCH_FIELDS,
      limit:  -1,
    }));
  }

  if (!rows.length) {
    console.log('\nNo upcoming/live matches found.');
    console.log('Run node seeder.mjs first to create match data.');
    process.exit(0);
  }

  // --one: pick a single random match (good for quick smoke tests)
  const targets = one ? [rows[Math.floor(Math.random() * rows.length)]] : rows;

  console.log(`    Simulating ${targets.length} match(es) concurrently…`);

  // Matches are independent — run them all in parallel so the live scoreboard
  // shows multiple simultaneous updates, which is the realistic scenario.
  await Promise.all(targets.map(simulate));

  console.log('\n✅  Simulation complete');
}

main().catch(err => {
  console.error('\n❌', err.message ?? err);
  process.exit(1);
});
