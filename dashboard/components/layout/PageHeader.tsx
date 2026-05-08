import type { EventStatus, MatchStatus } from '@/types/directus'

type Breadcrumb = {
  label: string
  href?: string
}

type Props = {
  breadcrumbs: Breadcrumb[]
  title:       string
  status?:     EventStatus | MatchStatus
  actions?:    React.ReactNode
}

export function PageHeader({ breadcrumbs, title, status, actions }: Props) {
  return (
    <div>
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-200">
          {breadcrumbs.map(({ label, href }, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-zinc-500 text-sm font-medium select-none">
                    ›
                  </span>
                )}
                {isLast ? (
                  <span className="text-sm font-bold text-foreground">
                    {label}
                  </span>
                ) : href ? (
                  <a
                    href={href}
                    className="text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    {label}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-zinc-500">
                    {label}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div className="space-y-1">
          {status && (
            <p className="text-sm italic text-muted-foreground/10 font-[500]">
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