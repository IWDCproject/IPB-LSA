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

  return (
    <div className="flex flex-col min-h-full">
      <div className="-mx-6 -mt-6">

        <PageHeader
          breadcrumbs={['Events', eventMeta?.name ?? '...']}
          title={eventMeta?.name ?? '...'}
          status={eventMeta?.status}
        />

        {/* Tabs — NO border-b on the container, only the active tab has an underline */}
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
    </div>
  )
}