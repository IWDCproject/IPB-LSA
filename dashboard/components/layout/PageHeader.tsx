import { StatusBadge } from '@/components/shared/StatusBadge'
import type { EventStatus, MatchStatus } from '@/types/directus'

type Props = {
  breadcrumbs: string[]
  title: string
  status?: EventStatus | MatchStatus
  actions?: React.ReactNode
}

export function PageHeader({ breadcrumbs, title, status, actions }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        {breadcrumbs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {breadcrumbs.join(' / ')}
          </p>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {status && <StatusBadge status={status} />}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}