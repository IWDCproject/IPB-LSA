'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
import type { EventStatus } from '@/types/directus'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSidebarContext } from '@/components/layout/SidebarContext'
import { useRouter } from '@/hooks/useRouter'

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
  slug:   string
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>()
  const pathname    = usePathname()
  const router      = useRouter()

  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null)
  const { setCurrentEventName }   = useSidebarContext()

  const isBuilder = pathname.includes('/builder')

  useEffect(() => {
    if (!eventId) return

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)
    const filter = isUuid ? { id: { _eq: eventId } } : { slug: { _eq: eventId } }

    directus
      .request(readItems('events', {
        filter,
        fields: ['name', 'status', 'slug'],
        limit:  1,
      }))
      .then((results) => {
        const meta = results[0] as EventMeta
        if (!meta) return
        setEventMeta(meta)
        setCurrentEventName(meta.name)
      })
      .catch(() => null)

    return () => {
      // Only clear if we're actually leaving the events section
      // (This prevents flickering when navigating between event tabs)
      if (!window.location.pathname.includes('/events/')) {
        setCurrentEventName(null)
      }
    }
  }, [eventId, setCurrentEventName])

  const activeSegment = pathname.split('/').pop() ?? ''

  // Breadcrumb for builder mode
  const segments = pathname.split('/').filter(Boolean)
  const afterEventId = segments.slice(segments.indexOf(eventId) + 1)
  const eventSlug = eventMeta?.slug ?? eventId
  const builderBreadcrumbs: { label: string; href?: string }[] = [
    { label: 'Events', href: '/events' },
    { label: eventMeta?.name ?? '...', href: `/events/${eventSlug}/matches` },
    ...afterEventId.map((s, i) => ({
      label: SEGMENT_LABELS[s] ?? s,
      href:  i < afterEventId.length - 1 ? `/events/${eventSlug}/${s}` : undefined,
    })),
  ]

  return (
    <div className={isBuilder ? "flex flex-col h-full" : "flex flex-col min-h-full"}>
      {isBuilder ? (
        <>
          {/* Breadcrumb only, negated to flush with container edges */}
          <div className="-mx-6 -mt-6 flex items-center gap-2 px-6 py-3 border-b border-zinc-200 shrink-0">
          {builderBreadcrumbs.map(({ label, href }, i) => {
              const isLast = i === builderBreadcrumbs.length - 1
              return (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-zinc-300 text-sm font-medium select-none">
                      ›
                    </span>
                  )}
                  {isLast ? (
                    <span className="text-sm font-bold text-foreground">{label}</span>
                  ) : href ? (
                    <a
                      href={href}
                      className="text-sm font-semibold text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-400">{label}</span>
                  )}
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
              breadcrumbs={[
                { label: 'Events', href: '/events' },
                { label: eventMeta?.name ?? '...', href: `/events/${eventSlug}/matches` },
                ...(SEGMENT_LABELS[activeSegment]
                  ? [{ label: SEGMENT_LABELS[activeSegment] }]
                  : []),
              ]}
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
                      onClick={() => router.push(`/events/${eventSlug}/${tab.segment}`)}
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