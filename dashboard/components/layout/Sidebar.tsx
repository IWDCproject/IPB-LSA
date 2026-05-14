'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { useSession } from 'next-auth/react'
import { UserMenu } from './UserMenu'
import { useSidebarContext } from './SidebarContext'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-3 pb-0.5 text-[12px] font-bold text-black/50 tracking-wide">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Nav link
// ---------------------------------------------------------------------------

function NavLink({
  href,
  label,
  active,
  indent = 0,
  bold = false,
}: {
  href:    string
  label:   string
  active:  boolean
  indent?: number
  bold?:   boolean
}) {
  return (
    <Link
      href={href}
      style={{ paddingLeft: `${8 + indent * 8}px` }}
      className={cn(
        'group flex items-center gap-2 rounded-lg py-1.5 pr-3 pl-3 text-sm transition-all duration-200 ease-in-out relative',
        bold ? 'font-[800]' : 'font-medium',
        active
          ? 'text-zinc-900'
          : 'text-foreground/60 hover:bg-muted hover:text-foreground hover:translate-x-1'
      )}
    >
      <span className={cn(
        'transition-all duration-200',
        active && 'font-black'
      )}>
        {label}
      </span>
      
      {active && (
        <span className="flex items-center text-[11px] font-black tracking-[-0.1em] text-zinc-900 translate-y-[0.5px] animate-in slide-in-from-right-2 fade-in duration-500">
          <span className="animate-[pulse_1.2s_infinite_0ms]">{'<'}</span>
          <span className="animate-[pulse_1.2s_infinite_200ms]">{'<'}</span>
          <span className="animate-[pulse_1.2s_infinite_400ms]">{'<'}</span>
        </span>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Always-expanded section group (Now non-clickable header)
// ---------------------------------------------------------------------------

function SectionGroup({
  label,
  children,
  indent = 0,
  bold = false,
}: {
  label:     string
  children?: React.ReactNode
  indent?:   number
  bold?:     boolean
}) {
  const labelClass = cn(
    'flex-1 pl-2 py-1.5 text-sm leading-none truncate text-foreground/60',
    bold ? 'font-[800]' : 'font-[600]'
  )

  return (
    <div style={{ paddingLeft: `${indent * 8}px` }}>
      <div className="flex items-center">
        <span className={labelClass}>{label}</span>
      </div>
      {children && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const LAST_EVENT_KEY = 'sidebar_last_event'

type StoredEvent = { slug: string; name: string }

export function Sidebar() {
  const pathname             = usePathname()
  const { isSuperAdmin }     = useRole()
  const { data: session }    = useSession()
  const { currentEventName } = useSidebarContext()

  const showAdminSection =
    isSuperAdmin ||
    (session?.user as any)?.role === 'super_admin' ||
    (session?.user as any)?.isSuperAdmin === true

  const isOnDashboard  = pathname === '/'
  const isOnAccessCtrl = pathname.startsWith('/access-control')

  const eventMatch     = pathname.match(/^\/events\/([^/]+)/)
  const currentEventId = eventMatch?.[1]   // slug from URL
  const isInEvent      = !!currentEventId && currentEventId !== 'new' && currentEventId !== 'new-wizard'

  const [sidebarEvent, setSidebarEvent] = useState<StoredEvent | null>(null)

  useEffect(() => {
    if (isInEvent && currentEventId && currentEventName) {
      const stored: StoredEvent = { slug: currentEventId, name: currentEventName }
      localStorage.setItem(LAST_EVENT_KEY, JSON.stringify(stored))
      setSidebarEvent(stored)
    }
  }, [isInEvent, currentEventId, currentEventName])

  useEffect(() => {
    if (isInEvent) return

    const raw = localStorage.getItem(LAST_EVENT_KEY)
    if (raw) {
      try {
        setSidebarEvent(JSON.parse(raw))
        return
      } catch {}
    }

    directus
      .request(readItems('events', {
        fields: ['name', 'slug'],
        sort:   ['-created_at'],
        limit:  1,
      }))
      .then((results) => {
        const e = results[0] as StoredEvent | undefined
        if (e?.slug) setSidebarEvent(e)
      })
      .catch(() => null)
  }, [isInEvent])

  useEffect(() => {
    // If we are in an event, and we have a slug, but no name in context yet
    if (isInEvent && currentEventId && !currentEventName) {
      // Try to find in sidebarEvent first (from localStorage)
      if (sidebarEvent?.slug === currentEventId) return

      // Otherwise fetch it
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentEventId)
      const filter = isUuid ? { id: { _eq: currentEventId } } : { slug: { _eq: currentEventId } }

      directus.request(readItems('events', {
        filter,
        fields: ['name', 'slug'],
        limit: 1
      })).then(results => {
        const e = results[0] as StoredEvent | undefined
        if (e) setSidebarEvent(e)
      }).catch(() => null)
    }
  }, [isInEvent, currentEventId, currentEventName, sidebarEvent?.slug])

  const displaySlug = isInEvent ? currentEventId! : sidebarEvent?.slug
  const displayName = isInEvent ? (currentEventName || sidebarEvent?.name || '...') : sidebarEvent?.name

  const eventSubPages = displaySlug
    ?[
        { label: 'Matches',      href: `/events/${displaySlug}/matches`      },
        { label: 'Formats',      href: `/events/${displaySlug}/formats`      },
        { label: 'Participants', href: `/events/${displaySlug}/participants`  },
        { label: 'Settings',     href: `/events/${displaySlug}/settings`     },
      ]
    :[]

  return (
    <aside className="flex w-[240px] shrink-0 flex-col bg-transparent">

      <div className="px-4 py-4 transition-transform duration-300 hover:scale-[1.01]">
        <Image
          src="/IWDC-logo.svg"
          width={200}
          height={40}
          alt="IPB Lucky Sports & Arts"
          className="w-full h-auto"
          unoptimized
        />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">

        <NavLink href="/" label="Dashboard" active={isOnDashboard} bold />

        <SectionLabel>Content Management</SectionLabel>

        <SectionGroup label="Events" bold>
          <NavLink
            href="/events"
            label="All Events"
            active={pathname === '/events'}
            indent={1}
          />
          <NavLink
            href="/events/new"
            label="Create Event"
            active={pathname === '/events/new'}
            indent={1}
          />
          {displaySlug && displayName && (
            <SectionGroup
              label={displayName}
              indent={1}
            >
              {eventSubPages.map((page) => (
                <NavLink
                  key={page.href}
                  href={page.href}
                  label={page.label}
                  active={pathname === page.href || pathname.startsWith(page.href + '/')}
                  indent={2}
                />
              ))}
            </SectionGroup>
          )}
        </SectionGroup>

        <div style={{ height: '16px' }} /> {/* Gap between Events and Articles */}
        <SectionGroup label="Articles" bold>
          <NavLink
            href="/articles"
            label="All Articles"
            active={pathname === '/articles'}
            indent={1}
          />
          <NavLink
            href="/articles/new"
            label="Add New Article"
            active={pathname === '/articles/new'}
            indent={1}
          />
        </SectionGroup>

        {showAdminSection && (
          <>
            <div style={{ height: '24px' }} />
            <SectionLabel>Super Admin Only</SectionLabel>

            <SectionGroup label="Access Control" bold>
              <NavLink
                href="/access-control/operators"
                label="Operators"
                active={pathname === '/access-control/operators'}
                indent={1}
              />
              <NavLink
                href="/access-control/activity-logs"
                label="Activity Log"
                active={pathname === '/access-control/activity-logs'}
                indent={1}
              />
            </SectionGroup>
          </>
        )}
      </nav>

      <UserMenu />
    </aside>
  )
}