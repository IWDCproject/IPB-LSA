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
    <p className="px-2 pt-5 pb-1 text-[12px] font-bold text-black/50 tracking-wide">
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
        'flex items-center rounded-lg py-2.5 pr-3 pl-3 text-sm transition-all duration-200 ease-in-out',
        bold ? 'font-[800]' : 'font-medium',
        active
          ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-md'
          : 'text-foreground/60 hover:bg-muted hover:text-foreground hover:translate-x-1'
      )}
    >
      {label}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Always-expanded section group (no chevron, no toggle)
// ---------------------------------------------------------------------------

function SectionGroup({
  label,
  href,
  active,
  children,
  indent = 0,
  bold = false,
}: {
  label:     string
  href?:     string
  active:    boolean
  children?: React.ReactNode
  indent?:   number
  bold?:     boolean
}) {
  const rowBase = cn(
    'flex items-center rounded-lg transition-all duration-200 ease-in-out',
    active
      ? 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-md'
      : [
          'text-foreground/60 hover:bg-muted hover:text-foreground',
          href && 'hover:translate-x-1'
        ]
  )

  const labelClass = cn(
    'flex-1 pl-2 py-2.5 text-sm leading-none truncate',
    bold ? 'font-[800]' : 'font-[600]'
  )

  return (
    <div style={{ paddingLeft: `${indent * 8}px` }}>
      <div className={rowBase}>
        {href ? (
          <Link href={href} className={labelClass}>{label}</Link>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
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
  const isOnEvents     = pathname.startsWith('/events')
  const isOnArticles   = pathname.startsWith('/articles')
  const isOnAccessCtrl = pathname.startsWith('/access-control')

  const eventMatch     = pathname.match(/^\/events\/([^/]+)/)
  const currentEventId = eventMatch?.[1]   // slug from URL
  const isInEvent      = !!currentEventId

  // The event shown in sidebar — either current URL event or last/latest
  const [sidebarEvent, setSidebarEvent] = useState<StoredEvent | null>(null)

  // Persist current event to localStorage whenever we navigate into one
  useEffect(() => {
    if (isInEvent && currentEventId && currentEventName) {
      const stored: StoredEvent = { slug: currentEventId, name: currentEventName }
      localStorage.setItem(LAST_EVENT_KEY, JSON.stringify(stored))
      setSidebarEvent(stored)
    }
  }, [isInEvent, currentEventId, currentEventName])

  // On mount (or when not in an event), load last event or fetch latest
  useEffect(() => {
    if (isInEvent) return

    const raw = localStorage.getItem(LAST_EVENT_KEY)
    if (raw) {
      try {
        setSidebarEvent(JSON.parse(raw))
        return
      } catch {}
    }

    // No stored event — fetch the most recently created one
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

  const displaySlug = isInEvent ? currentEventId! : sidebarEvent?.slug
  const displayName = isInEvent ? (currentEventName ?? sidebarEvent?.name) : sidebarEvent?.name

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

      {/* -- Brand --------------------------------------------------------- */}
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

      {/* -- Navigation ---------------------------------------------------- */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">

        <NavLink href="/" label="Dashboard" active={isOnDashboard} bold />

        <SectionLabel>Content Management</SectionLabel>

        <SectionGroup
          label="Events"
          href="/events"
          active={pathname === '/events'}
          bold
        >
          {displaySlug && displayName && (
            <SectionGroup
              label={displayName}
              active={false}
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

        <SectionGroup
          label="Articles"
          href="/articles"
          active={false} 
          bold
        >
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
            {/* spacer dikit */}
            <div style={{ height: '10px' }} />
            <SectionLabel>Super Admin Only</SectionLabel>

            <NavLink
              href="/settings"
              label="Settings"
              active={pathname === '/settings'}
            />

            <SectionGroup
              label="Access Control"
              active={isOnAccessCtrl}
              bold
            >
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

      {/* -- User footer --------------------------------------------------- */}
      <UserMenu />
    </aside>
  )
}