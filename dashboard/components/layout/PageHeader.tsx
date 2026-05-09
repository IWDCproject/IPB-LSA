import type { EventStatus, MatchStatus } from '@/types/directus'

type Breadcrumb = {
  label: string
  href?: string
}

type Props = {
  breadcrumbs: Breadcrumb[]
  title?:      string // Made optional
  status?:     EventStatus | MatchStatus
  actions?:    React.ReactNode
}

export function PageHeader({ breadcrumbs, title, status, actions }: Props) {
  return (
    <div className="bg-white">
      {/* Top Row: Breadcrumbs and Actions (if no title) */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          {breadcrumbs.map(({ label, href }, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-400 text-sm">›</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-sm font-bold text-zinc-900">{label}</span>
              ) : (
                <a href={href} className="text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
                  {label}
                </a>
              )}
            </span>
          ))}
        </div>
        
        {/* If no title, move actions here to save space */}
        {!title && actions && <div>{actions}</div>}
      </div>

      {/* Second Row: Only rendered if Title or Status exists */}
      {(title || status) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-zinc-200">
          <div className="space-y-1">
            {status && <p className="text-sm italic text-zinc-400 font-medium">Event status: {status}</p>}
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
          </div>
          {/* If there IS a title, keep actions here */}
          {actions && <div>{actions}</div>}
        </div>
      )}
    </div>
  )
}