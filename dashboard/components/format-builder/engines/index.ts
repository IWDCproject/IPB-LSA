import type { EngineType } from '@/types/directus'
import type { ComponentType } from 'react'

import { ScoreTimedConfig }  from './ScoreTimedConfig'
import { ScoreSetsConfig }   from './ScoreSetsConfig'
import { JudgeScoresConfig } from './JudgeScoresConfig'
import { FinishTimeConfig, ManualPickConfig } from './FinishTimeAndManualPickConfig'

export const ENGINE_CONFIGS: Record<EngineType, ComponentType> = {
  score_timed:  ScoreTimedConfig,
  score_sets:   ScoreSetsConfig,
  judge_scores: JudgeScoresConfig,
  finish_time:  FinishTimeConfig,
  manual_pick:  ManualPickConfig,
}