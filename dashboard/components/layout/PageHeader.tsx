import type { EventStatus, MatchStatus } from '@/types/directus'

type Props = {
  breadcrumbs: string[]
  title:       string
  status?:     EventStatus | MatchStatus
  actions?:    React.ReactNode
}

export function PageHeader({ breadcrumbs, title, status, actions }: Props) {
  return (
    <div>
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-200">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/40 text-sm">›</span>}
                <span className={isLast
                  ? 'text-sm font-semibold text-foreground'
                  : 'text-sm text-muted-foreground/50'
                }>
                  {crumb}
                </span>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div className="space-y-1">
          {status && (
            <p className="text-sm italic text-muted-foreground/60 font-light">
              Event status: {status}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}