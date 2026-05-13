import type { LiveState, MatchFormat, Participant, SetLogEntry } from '@/types/directus'

export type { SetLogEntry }

export type EnginePanelProps = {
  liveState:        LiveState
  onPatch:          (partial: Partial<LiveState>) => Promise<void>
  format:           MatchFormat
  participants:     Participant[]
  homeParticipant?: Participant | null
  awayParticipant?: Participant | null
}