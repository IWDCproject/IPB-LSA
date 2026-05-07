import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EventStatus, MatchStatus } from '@/types/directus'

type Props = {
  status: EventStatus | MatchStatus
  className?: string
}

const LABEL: Record<EventStatus | MatchStatus, string> = {
  draft:     'Draft',
  upcoming:  'Upcoming',
  active:    'Active',
  live:      'Live',
  finished:  'Finished',
  cancelled: 'Cancelled',
}

const STYLE: Record<EventStatus | MatchStatus, string> = {
  draft:     'bg-amber-100 text-amber-800 border-amber-200',
  upcoming:  'bg-blue-100 text-blue-800 border-blue-200',
  active:    'bg-green-100 text-green-800 border-green-200',
  live:      'bg-red-100 text-red-800 border-red-200',
  finished:  'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
}

export function StatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', STYLE[status], className)}
    >
      {status === 'live' && (
        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {LABEL[status]}
    </Badge>
  )
}