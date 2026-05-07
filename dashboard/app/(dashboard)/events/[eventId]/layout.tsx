'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { readItem } from '@directus/sdk'
import { directus } from '@/lib/directus'
import type { EventStatus } from '@/types/directus'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSidebarContext } from '@/components/layout/SidebarContext'

const EVENT_TABS = [
  { label: 'Matches',                     segment: 'matches'      },
  { label: 'Formats & Categories',        segment: 'formats'      },
  { label: 'Participants & Institutions', segment: 'participants'  },
  { label: 'Settings',                    segment: 'settings'     },
] as const

const SEGMENT_LABELS: Record<string, string> = {
  matches:      'Matches',
  formats:      'Formats & Categories',
  participants: 'Participants & Institutions',
  settings:     'Settings',
  builder:      'Format Builder',
}

type EventMeta = {
  name:   string
  status: EventStatus
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>()
  const pathname    = usePathname()
  const router      = useRouter()

  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null)
  const { setCurrentEventName }   = useSidebarContext()

  const isBuilder = pathname.includes('/builder')

  useEffect(() => {
    directus
      .request(readItem('events', eventId, { fields: ['name', 'status'] }))
      .then((e) => {
        const meta = e as EventMeta
        setEventMeta(meta)
        setCurrentEventName(meta.name)
      })
      .catch(() => null)

    return () => setCurrentEventName(null)
  }, [eventId, setCurrentEventName])

  const activeSegment = pathname.split('/').pop() ?? ''

  // Breadcrumb for builder mode
  const segments = pathname.split('/').filter(Boolean)
  const afterEventId = segments.slice(segments.indexOf(eventId) + 1)
  const builderBreadcrumbs = [
    'Events',
    eventMeta?.name ?? '...',
    ...afterEventId.map((s) => SEGMENT_LABELS[s] ?? s),
  ]

  return (
    <div className={isBuilder ? "flex flex-col h-full" : "flex flex-col min-h-full"}>
      {isBuilder ? (
        <>
          {/* Breadcrumb only, negated to flush with container edges */}
          <div className="-mx-6 -mt-6 flex items-center gap-2 px-6 py-3 border-b border-zinc-200 shrink-0">
            {builderBreadcrumbs.map((crumb, i) => {
              const isLast = i === builderBreadcrumbs.length - 1
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

          {/* Builder fills remaining space, negated to flush edges, no padding */}
          <div className="-mx-6 flex-1 overflow-hidden min-h-0">
            {children}
          </div>
        </>
      ) : (
        <>
          <div className="-mx-6 -mt-6">
            <PageHeader
              breadcrumbs={['Events', eventMeta?.name ?? '...']}
              title={eventMeta?.name ?? '...'}
              status={eventMeta?.status}
            />

            <div className="px-6">
              <nav className="flex gap-6" aria-label="Event sections">
                {EVENT_TABS.map((tab) => {
                  const isActive = activeSegment === tab.segment
                  return (
                    <button
                      key={tab.segment}
                      onClick={() => router.push(`/events/${eventId}/${tab.segment}`)}
                      className={[
                        'py-2.5 text-sm font-[600] transition-colors',
                        isActive
                          ? 'underline underline-offset-4 decoration-2 text-foreground'
                          : 'text-zinc-400 hover:text-foreground',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          <div className="pt-6 flex-1">{children}</div>
        </>
      )}
    </div>
  )
}