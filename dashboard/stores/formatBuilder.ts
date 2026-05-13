"use client"

import { create } from 'zustand'
import type {
  MatchType,
  EngineType,
  ScoringMethod,
  TimerMode,
  FormatModule,
  MatchFormat,
} from '@/types/directus'

// --- Konstanta -------------------------------------------------

// Engine yang valid untuk setiap match_type
const VALID_ENGINES: Record<MatchType, EngineType[]> = {
  head_to_head: ['score_timed', 'score_sets', 'manual_pick'],
  solo:         ['judge_scores', 'finish_time'],
  open:         ['finish_time', 'manual_pick'],
}

const DEFAULT_ENGINE_STATE: EngineState = {
  type:        'score_timed',
  scoreLabel:  'Poin',
  hasPeriods:  false,
  periodTerm:  'Babak',
  periodCount: 2,
  setTerm:     'Set',
  maxSets:     5,
  setsToWin:   3,
  numJudges:   5,
  scoreMin:    0,
  scoreMax:    10,
  step:        0.5,
  method:      'avg',
  unit:        's',
  rankOrder:   'asc',
  allowDraw:   false,
  topN:        3,
  rankedOrder: true,
}

const DEFAULT_ADD_ONS: FormatBuilderState['addOns'] = {
  timer: { enabled: false, mode: 'countdown', duration: 180 },
  notes: { enabled: false },
}

// --- Types -----------------------------------------------------

type EngineState = {
  type: EngineType

  // score_timed
  scoreLabel:  string
  hasPeriods:  boolean
  periodTerm:  string
  periodCount: number

  // score_sets (pakai scoreLabel juga)
  setTerm:   string
  maxSets:   number
  setsToWin: number

  // judge_scores
  numJudges: number
  scoreMin:  number
  scoreMax:  number
  step:      number
  method:    ScoringMethod

  // finish_time
  unit:      's' | 'ms'
  rankOrder: 'asc' | 'desc'

  // manual_pick
  allowDraw:   boolean
  topN:        number
  rankedOrder: boolean
}

export type FormatBuilderState = {
  formatName: string
  matchType:  MatchType
  engine:     EngineState
  addOns: {
    timer: { enabled: boolean; mode: TimerMode; duration: number }
    notes: { enabled: boolean }
  }

  setFormatName:       (name: string) => void
  setMatchType:        (type: MatchType) => void
  setEngine:           (partial: Partial<EngineState>) => void
  setAddOn:            <K extends keyof FormatBuilderState['addOns']>(key: K, partial: Partial<FormatBuilderState['addOns'][K]>) => void
  reset:               () => void
  loadFromExisting:    (format: MatchFormat) => void
  buildModulesPayload: () => FormatModule[]
}

// --- Store -----------------------------------------------------

export const useFormatBuilder = create<FormatBuilderState>((set, get) => ({
  formatName: '',
  matchType:  'head_to_head',
  engine:     { ...DEFAULT_ENGINE_STATE },
  addOns:     { ...DEFAULT_ADD_ONS, timer: { ...DEFAULT_ADD_ONS.timer }, notes: { ...DEFAULT_ADD_ONS.notes } },

  setFormatName: (name) => set({ formatName: name }),

  setMatchType: (type) =>
    set((state) => {
      const validEngines = VALID_ENGINES[type]
      
      // Gunakan Type Assertion 'as EngineType' untuk meyakinkan TS
      // atau gunakan operator '!' jika agan yakin index 0 pasti ada
      const engineType = validEngines.includes(state.engine.type)
        ? state.engine.type
        : (validEngines[0] as EngineType) 

      return {
        matchType: type,
        engine: { ...state.engine, type: engineType },
      }
    }),

  setEngine: (partial) =>
    set((state) => ({ engine: { ...state.engine, ...partial } })),

  setAddOn: (key, partial) =>
    set((state) => ({
      addOns: {
        ...state.addOns,
        [key]: { ...state.addOns[key], ...partial },
      },
    })),

  reset: () =>
    set({
      formatName: '',
      matchType:  'head_to_head',
      engine:     { ...DEFAULT_ENGINE_STATE },
      addOns:     {
        timer: { ...DEFAULT_ADD_ONS.timer },
        notes: { ...DEFAULT_ADD_ONS.notes },
      },
    }),

  loadFromExisting: (format) => {
    const engineMod = format.modules[0]
    if (!engineMod) return

    const base: Partial<EngineState> = { type: engineMod.type as EngineType }

    if (engineMod.type === 'score_timed') {
      const c = engineMod.config
      base.scoreLabel  = c.score_label
      base.hasPeriods  = c.has_periods
      base.periodTerm  = c.period_term  ?? DEFAULT_ENGINE_STATE.periodTerm
      base.periodCount = c.period_count ?? DEFAULT_ENGINE_STATE.periodCount
    } else if (engineMod.type === 'score_sets') {
      const c = engineMod.config
      base.scoreLabel = c.score_label
      base.setTerm    = c.term
      base.maxSets    = c.max_sets
      base.setsToWin  = c.sets_to_win
    } else if (engineMod.type === 'judge_scores') {
      const c = engineMod.config
      base.numJudges = c.num_judges
      base.scoreMin  = c.score_min
      base.scoreMax  = c.score_max
      base.step      = c.step
      base.method    = c.method
    } else if (engineMod.type === 'finish_time') {
      const c = engineMod.config
      base.unit      = c.unit
      base.rankOrder = c.rank_order
    } else if (engineMod.type === 'manual_pick') {
      const c = engineMod.config
      base.allowDraw   = c.allow_draw   ?? DEFAULT_ENGINE_STATE.allowDraw
      base.topN        = c.top_n        ?? DEFAULT_ENGINE_STATE.topN
      base.rankedOrder = c.ranked_order ?? DEFAULT_ENGINE_STATE.rankedOrder
    }

    const timerMod = format.modules.find((m) => m.type === 'timer')
    const notesMod = format.modules.find((m) => m.type === 'notes')

    set({
      formatName: format.name,
      matchType:  format.match_type,
      engine:     { ...DEFAULT_ENGINE_STATE, ...base },
      addOns: {
        timer: timerMod
          ? { enabled: true, mode: timerMod.config.mode, duration: timerMod.config.duration ?? 180 }
          : { ...DEFAULT_ADD_ONS.timer },
        notes: { enabled: !!notesMod },
      },
    })
  },

  buildModulesPayload: (): FormatModule[] => {
    const { engine, addOns } = get()
    const modules: FormatModule[] = []

    if (engine.type === 'score_timed') {
      modules.push({
        type:   'score_timed',
        config: {
          score_label: engine.scoreLabel,
          has_periods: engine.hasPeriods,
          ...(engine.hasPeriods && {
            period_term:  engine.periodTerm,
            period_count: engine.periodCount,
          }),
        },
      })
    } else if (engine.type === 'score_sets') {
      modules.push({
        type:   'score_sets',
        config: {
          score_label: engine.scoreLabel,
          term:        engine.setTerm,
          max_sets:    engine.maxSets,
          sets_to_win: engine.setsToWin,
        },
      })
    } else if (engine.type === 'judge_scores') {
      modules.push({
        type:   'judge_scores',
        config: {
          num_judges: engine.numJudges,
          score_min:  engine.scoreMin,
          score_max:  engine.scoreMax,
          step:       engine.step,
          method:     engine.method,
        },
      })
    } else if (engine.type === 'finish_time') {
      modules.push({
        type:   'finish_time',
        config: {
          unit:       engine.unit,
          rank_order: engine.rankOrder,
        },
      })
    } else if (engine.type === 'manual_pick') {
      modules.push({
        type:   'manual_pick',
        config: {
          allow_draw:   engine.allowDraw,
          top_n:        engine.topN,
          ranked_order: engine.rankedOrder,
        },
      })
    }

    if (addOns.timer.enabled) {
      modules.push({
        type:   'timer',
        config: {
          mode:     addOns.timer.mode,
          duration: addOns.timer.mode !== 'deadline' ? addOns.timer.duration : undefined,
        },
      })
    }

    if (addOns.notes.enabled) {
      modules.push({ type: 'notes', config: {} })
    }

    return modules
  },
}))