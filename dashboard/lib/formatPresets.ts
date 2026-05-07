// src/lib/formatPresets.ts
import type { MatchType, FormatModule } from '@/types/directus'

export type FormatPreset = {
  id: string
  name: string
  category: 'Sports' | 'E-Sports' | 'Arts' | 'Misc'
  description: string
  matchType: MatchType
  modules: FormatModule[]
}

export const PRESETS: FormatPreset[] =[
  // ─── SPORTS: BALL GAMES ────────────────────────────────────────────────────────
  {
    id: 'futsal',
    name: 'Futsal',
    category: 'Sports',
    description: 'Score Timed, 2 babak x 20 menit (FIFA Futsal Rules).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Gol', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 1200 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'basket',
    name: 'Bola Basket',
    category: 'Sports',
    description: 'Score Timed, 4 quarter x 10 menit (FIBA Rules).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Quarter', period_count: 4 } },
      { type: 'timer', config: { mode: 'countdown', duration: 600 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'sepak_bola',
    name: 'Sepak Bola',
    category: 'Sports',
    description: 'Score Timed, 2 babak x 45 menit.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Gol', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 2700 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'mini_soccer',
    name: 'Mini Soccer',
    category: 'Sports',
    description: 'Score Timed, 2 babak x 20 menit.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Gol', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 1200 } },
      { type: 'notes', config: {} },
    ],
  },
  
  // ─── SPORTS: RACQUET & NET ───────────────────────────────────────────────────
  {
    id: 'badminton',
    name: 'Badminton',
    category: 'Sports',
    description: 'Score Sets, Best of 3, 21 Poin (BWF Rules).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Game', max_sets: 3, sets_to_win: 2 } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'voli',
    name: 'Bola Voli',
    category: 'Sports',
    description: 'Score Sets, Best of 5, 25 Poin (FIVB Rules).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Set', max_sets: 5, sets_to_win: 3 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tenis_meja',
    name: 'Tenis Meja',
    category: 'Sports',
    description: 'Score Sets, Best of 5, 11 Poin (ITTF Rules).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Game', max_sets: 5, sets_to_win: 3 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tenis_lapangan',
    name: 'Tenis Lapangan',
    category: 'Sports',
    description: 'Score Sets, Best of 3 Sets.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Game', term: 'Set', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'sepak_takraw',
    name: 'Sepak Takraw',
    category: 'Sports',
    description: 'Score Sets, Best of 3, 15 Poin per Set (ISTAF Rules Update 2024).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Set', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    category: 'Sports',
    description: 'Score Sets, Best of 3 Games, 11 Poin.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Game', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'biliar',
    name: 'Biliar (9-Ball / 8-Ball)',
    category: 'Sports',
    description: 'Score Sets, Race to 5 (Cari 5 frame kemenangan).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Bola', term: 'Frame', max_sets: 9, sets_to_win: 5 } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── SPORTS: MARTIAL ARTS & COMBAT ─────────────────────────────────────────
  {
    id: 'kumite',
    name: 'Karate (Kumite)',
    category: 'Sports',
    description: 'Score Timed, 1 Babak mutlak (3 menit).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: false } },
      { type: 'timer', config: { mode: 'countdown', duration: 180 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'kata',
    name: 'Karate (Kata - Flag System)',
    category: 'Sports',
    description: 'Manual Pick H2H (Aka vs Ao). Menang via angkat bendera juri.',
    matchType: 'head_to_head',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'silat_tanding',
    name: 'Pencak Silat (Tanding)',
    category: 'Sports',
    description: 'Score Timed, 3 babak x 2 menit. Poin diakumulasi sepanjang babak.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Babak', period_count: 3 } },
      { type: 'timer', config: { mode: 'countdown', duration: 120 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'silat_seni',
    name: 'Pencak Silat (Seni / TGR)',
    category: 'Sports',
    description: 'Judge Panel (Solo), 10 Juri, buang tertinggi/terendah. Timer wajib 3 menit.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 10, score_min: 8.0, score_max: 10.0, step: 0.01, method: 'drop_extremes' } },
      { type: 'timer', config: { mode: 'countdown', duration: 180 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'taekwondo_kyorugi',
    name: 'Taekwondo (Kyorugi)',
    category: 'Sports',
    description: 'Score Sets (Best of 3 Rounds). Aturan terbaru WT (menang 2 ronde = menang mutlak).',
    matchType: 'head_to_head',
    modules:[
      // Kyorugi rules berubah 2022: Bukan akumulasi poin lagi, melainkan mencari kemenangan 2 ronde (Best of 3).
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Ronde', max_sets: 3, sets_to_win: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 120 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'taekwondo_poomsae',
    name: 'Taekwondo (Poomsae)',
    category: 'Sports',
    description: 'Judge Panel (Solo), 5 Juri, Average.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 5, score_min: 0, score_max: 10, step: 0.1, method: 'avg' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'wushu_sanda',
    name: 'Wushu (Sanda / Tarung)',
    category: 'Sports',
    description: 'Score Sets (Best of 3 Rounds). Siapa menang 2 ronde duluan menang.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Poin', term: 'Ronde', max_sets: 3, sets_to_win: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 120 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'wushu_taolu',
    name: 'Wushu (Taolu / Seni)',
    category: 'Sports',
    description: 'Judge Panel (Solo). Skala poin 0 - 10.00, potong tertinggi & terendah.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 5, score_min: 0, score_max: 10, step: 0.01, method: 'drop_extremes' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tarung_derajat',
    name: 'Tarung Derajat',
    category: 'Sports',
    description: 'Score Timed, 3 ronde x 2 menit. Poin diakumulasi dari seluruh ronde.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Ronde', period_count: 3 } },
      { type: 'timer', config: { mode: 'countdown', duration: 120 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tinju',
    name: 'Tinju / Boxing',
    category: 'Sports',
    description: 'Score Timed, 3 ronde x 3 menit.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Ronde', period_count: 3 } },
      { type: 'timer', config: { mode: 'countdown', duration: 180 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'anggar',
    name: 'Anggar / Fencing',
    category: 'Sports',
    description: 'Score Timed, 3 periode x 3 menit. Race to 15 poin.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Touch', has_periods: true, period_term: 'Periode', period_count: 3 } },
      { type: 'timer', config: { mode: 'countdown', duration: 180 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'judo',
    name: 'Judo',
    category: 'Sports',
    description: 'Score Timed, 1 ronde 4 menit. Waza-ari / Ippon.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: false } },
      { type: 'timer', config: { mode: 'countdown', duration: 240 } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── SPORTS: RACES & ATHLETICS ─────────────────────────────────────────────
  {
    id: 'sprint',
    name: 'Lari Sprint 100m',
    category: 'Sports',
    description: 'Finish Time, Waktu Tercepat, Milidetik.',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 'ms', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'marathon',
    name: 'Lari Jarak Jauh / Marathon',
    category: 'Sports',
    description: 'Finish Time, Waktu Tercepat, Detik.',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 's', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'renang',
    name: 'Renang',
    category: 'Sports',
    description: 'Finish Time, Waktu Tercepat, Milidetik.',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 'ms', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'sepeda',
    name: 'Balap Sepeda / Cycling',
    category: 'Sports',
    description: 'Finish Time, Waktu Tercepat.',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 'ms', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'panahan_recurve',
    name: 'Panahan (Recurve H2H)',
    category: 'Sports',
    description: 'Score Sets (Sistem Set Poin). Maks 5 Seri, cari 6 poin kemenangan.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Set Poin', term: 'Seri', max_sets: 5, sets_to_win: 3 } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'lompat_jauh',
    name: 'Lompat Jauh / Tolak Peluru',
    category: 'Sports',
    description: 'Manual Pick (Open), urutan ranking mutlak berdasarkan jarak terjauh.',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 8, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── SPORTS: TRADITIONAL / PORSENI ─────────────────────────────────────────
  {
    id: 'gobak_sodor',
    name: 'Gobak Sodor / Hadang',
    category: 'Sports',
    description: 'Score Timed, 2 babak x 15 menit. Poin diakumulasi.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 900 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'bakiak',
    name: 'Bakiak / Terompah Panjang',
    category: 'Sports',
    description: 'Finish Time, Open Race (Cari waktu lari estafet tercepat).',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 'ms', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── E-SPORTS ──────────────────────────────────────────────────────────────
  {
    id: 'mlbb',
    name: 'Mobile Legends (MLBB)',
    category: 'E-Sports',
    description: 'Score Sets, Best of 3.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Skor', term: 'Match', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'valorant',
    name: 'Valorant / CS:GO',
    category: 'E-Sports',
    description: 'Score Sets, Best of 3 Maps.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Ronde', term: 'Map', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'pubgm',
    name: 'PUBG Mobile / Free Fire',
    category: 'E-Sports',
    description: 'Manual Pick, Open, Urutan klasemen/ranking placement tim.',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 16, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'fifa',
    name: 'FC 24 / eFootball',
    category: 'E-Sports',
    description: 'Score Timed, 2 babak x 6 menit in-game.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Gol', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'countdown', duration: 360 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tekken',
    name: 'Tekken 8 / Street Fighter',
    category: 'E-Sports',
    description: 'Score Sets, Best of 3 / 5 Match.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Game', term: 'Match', max_sets: 5, sets_to_win: 3 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'autobattler',
    name: 'Magic Chess / TFT',
    category: 'E-Sports',
    description: 'Manual Pick (Open). Ranking berdasar urutan tereliminasi (Top 1-8).',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 8, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'speedrun',
    name: 'Speedrun Competition',
    category: 'E-Sports',
    description: 'Finish Time (Open). Siapa yang tercepat menamatkan objektif dalam game.',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 'ms', rank_order: 'asc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── ARTS & CREATIVE ───────────────────────────────────────────────────────
  {
    id: 'padus',
    name: 'Paduan Suara / Choir',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Average.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 0.5, method: 'avg' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tari_tradisional',
    name: 'Tari Tradisional',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Sum.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'sum' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'dance_cover',
    name: 'Modern Dance / Cover',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Sum.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'sum' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'solo_vokal',
    name: 'Solo Vokal',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Average.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 0.5, method: 'avg' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'band',
    name: 'Band / Akustik',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Sum. Timer untuk setup / perform.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'sum' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'puisi',
    name: 'Baca Puisi',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Sum.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'sum' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'standup',
    name: 'Stand-up Comedy',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Average. Timer 5 menit mutlak.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'avg' } },
      { type: 'timer', config: { mode: 'countdown', duration: 300 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'pidato',
    name: 'Pidato / Speech',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Average. Timer pidato 7 menit.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'avg' } },
      { type: 'timer', config: { mode: 'countdown', duration: 420 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'cosplay',
    name: 'Cosplay Competition',
    category: 'Arts',
    description: 'Judge Panel, 3 Juri, Sum.',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 1, method: 'sum' } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'paskibra_lkbb',
    name: 'Paskibra (LKBB)',
    category: 'Arts',
    description: 'Judge Panel (Solo), 3 Juri (PBB, Formasi, Danton). Diakumulasi (Sum).',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 3000, step: 1, method: 'sum' } },
      { type: 'timer', config: { mode: 'countdown', duration: 900 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'cheerleading',
    name: 'Cheerleading / Senam Kreasi',
    category: 'Arts',
    description: 'Judge Panel (Solo), 3-5 Juri, Skor ditotal (Sum).',
    matchType: 'solo',
    modules:[
      { type: 'judge_scores', config: { num_judges: 3, score_min: 0, score_max: 100, step: 0.5, method: 'sum' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },

  // ─── MISC & ACADEMICS ──────────────────────────────────────────────────────
  {
    id: 'debat',
    name: 'Debat',
    category: 'Misc',
    description: 'Manual Pick, H2H, Tanpa Draw.',
    matchType: 'head_to_head',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false } },
      { type: 'timer', config: { mode: 'countdown', duration: 420 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'catur',
    name: 'Catur',
    category: 'Misc',
    description: 'Manual Pick, Bisa Draw.',
    matchType: 'head_to_head',
    modules:[
      { type: 'manual_pick', config: { allow_draw: true } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'cerdas_cermat',
    name: 'Cerdas Cermat (1v1)',
    category: 'Misc',
    description: 'Score Timed (H2H), 2 Babak (Pertanyaan Wajib & Rebutan).',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_timed', config: { score_label: 'Poin', has_periods: true, period_term: 'Babak', period_count: 2 } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'hackathon',
    name: 'Hackathon / Ideathon',
    category: 'Misc',
    description: 'Manual Pick (Open), Top 3 Winner.',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'karya_tulis',
    name: 'Esai / Karya Tulis',
    category: 'Misc',
    description: 'Manual Pick, Top 3 Winner (Penjurian Offline).',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'fotografi',
    name: 'Fotografi / Desain Poster',
    category: 'Misc',
    description: 'Manual Pick, Top 3 Winner.',
    matchType: 'open',
    modules:[
      { type: 'manual_pick', config: { allow_draw: false, top_n: 3, ranked_order: true } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'tarik_tambang',
    name: 'Tarik Tambang',
    category: 'Misc',
    description: 'Score Sets, Best of 3.',
    matchType: 'head_to_head',
    modules:[
      { type: 'score_sets', config: { score_label: 'Menang', term: 'Ronde', max_sets: 3, sets_to_win: 2 } },
      { type: 'notes', config: {} },
    ],
  },
  {
    id: 'endurance',
    name: 'Endurance (Plank/Tahan Napas)',
    category: 'Misc',
    description: 'Finish Time (Open), Peringkat diurutkan dari waktu terlama (Descending).',
    matchType: 'open',
    modules:[
      { type: 'finish_time', config: { unit: 's', rank_order: 'desc' } },
      { type: 'timer', config: { mode: 'stopwatch', duration: 0 } },
      { type: 'notes', config: {} },
    ],
  },
]