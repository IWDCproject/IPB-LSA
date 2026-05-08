import type { EngineType } from '@/types/directus'
import type { ComponentType } from 'react'
import type { EnginePanelProps } from '../types'

import ScoreTimedPanel  from '../ScoreTimedPanel'
import ScoreSetsPanel   from '../ScoreSetsPanel'
import JudgeScoresPanel from '../JudgeScoresPanel'
import FinishTimePanel  from '../FinishTimePanel'
import ManualPickPanel  from '../ManualPickPanel'

export const ENGINE_PANELS: Record<EngineType, ComponentType<EnginePanelProps>> = {
  score_timed:  ScoreTimedPanel,
  score_sets:   ScoreSetsPanel,
  judge_scores: JudgeScoresPanel,
  finish_time:  FinishTimePanel,
  manual_pick:  ManualPickPanel,
}

export type { EnginePanelProps }