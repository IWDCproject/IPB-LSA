'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useRole } from '@/hooks/useRole'
import { useSession } from 'next-auth/react'
import { UserMenu } from './UserMenu'
import { useSidebarContext } from './SidebarContext'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Section label  ("Content Management", "Super Admin Only")
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-5 pb-1 text-[11px] font-semibold text-foreground/40 tracking-wide">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Plain nav link
// ---------------------------------------------------------------------------

function NavLink({
  href,
  label,
  active,
  indent = 0,
}: {
  href:    string
  label:   string
  active:  boolean
  indent?: number
}) {
  return (
    <Link
      href={href}
      style={{ paddingLeft: `${8 + indent * 8}px` }}
      className={cn(
        'flex items-center rounded-lg py-2.5 pr-3 pl-3 text-sm font-medium',
        active
          ? 'bg-zinc-900 text-white'
          : 'text-foreground/60 hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Collapsible nav row
// ---------------------------------------------------------------------------

function CollapsibleNav({
  label,
  href,
  open,
  onToggle,
  active,
  children,
  indent = 0,
  bold = false,
}: {
  label:     string
  href?:     string
  open:      boolean
  onToggle:  () => void
  active:    boolean
  children?: React.ReactNode
  indent?:   number
  bold?:     boolean
}) {
  const rowBase = cn(
    'flex items-center rounded-lg transition-colors',
    active
      ? 'bg-zinc-900 text-white'
      : 'text-foreground/60 hover:bg-muted hover:text-foreground'
  )

  const labelClass = cn(
    'flex-1 py-2.5 text-sm leading-none font-[600]',
    bold && 'font-[800]',
  )

  return (
    <div style={{ paddingLeft: `${indent * 8}px` }}> 
      <div className={rowBase}>
        {href ? (
          <Link href={href} className={cn('pl-2', labelClass)}>
            {label}
          </Link>
        ) : (
          <button
            onClick={onToggle}
            className={cn('pl-2 text-left', labelClass)}
          >
            {label}
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="px-2 py-1.5 shrink-0"
        >
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform duration-200',
              !open && '-rotate-90'
            )}
          />
        </button>
      </div>

      {open && children && (
        <div className="mt-0.5 space-y-0.5">{children}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

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
  const currentEventId = eventMatch?.[1]
  const isInEvent      = !!currentEventId

  const [eventsOpen,       setEventsOpen]       = useState(isOnEvents)
  const [currentEventOpen, setCurrentEventOpen] = useState(isInEvent)
  const [articlesOpen,     setArticlesOpen]     = useState(isOnArticles)
  const [accessCtrlOpen,   setAccessCtrlOpen]   = useState(isOnAccessCtrl)

  useEffect(() => { if (isOnEvents) setEventsOpen(true) }, [isOnEvents])
  useEffect(() => {
    if (isInEvent) {
      setEventsOpen(true)
      setCurrentEventOpen(true)
    }
  }, [isInEvent, currentEventId])
  useEffect(() => { if (isOnArticles)   setArticlesOpen(true)   }, [isOnArticles])
  useEffect(() => { if (isOnAccessCtrl) setAccessCtrlOpen(true) }, [isOnAccessCtrl])

  const eventSubPages = currentEventId
    ? [
        { label: 'Matches',      href: `/events/${currentEventId}/matches`     },
        { label: 'Formats',      href: `/events/${currentEventId}/formats`     },
        { label: 'Participants', href: `/events/${currentEventId}/participants` },
        { label: 'Settings',     href: `/events/${currentEventId}/settings`    },
      ]
    : []

  return (
    // No border-r — the panel contrast in layout.tsx does the visual separation
    <aside className="flex w-[240px] shrink-0 flex-col bg-transparent">

      {/* ── Brand — no border-b ─────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <Image
          src="/IWDC-logo.svg"
          width={200}
          height={40}
          alt="IPB Lucky Sports & Arts"
          className="w-full h-auto"
          unoptimized
        />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">

        <NavLink href="/" label="Dashboard" active={isOnDashboard} />

        <SectionLabel>Content Management</SectionLabel>

        <CollapsibleNav
          label="Events"
          href="/events"
          open={eventsOpen}
          onToggle={() => setEventsOpen((v) => !v)}
          active={pathname === '/events'} 
          bold
        >
          {isInEvent && currentEventId && (
            <CollapsibleNav
              label={currentEventName ?? currentEventId}
              open={currentEventOpen}
              onToggle={() => setCurrentEventOpen((v) => !v)}
              active={false}
              indent={1}
            >
              {eventSubPages.map((page) => (
                <NavLink
                  key={page.href}
                  href={page.href}
                  label={page.label}
                  active={
                    pathname === page.href ||
                    pathname.startsWith(page.href + '/')
                  }
                  indent={2}
                />
              ))}
            </CollapsibleNav>
          )}
        </CollapsibleNav>

        <CollapsibleNav
          label="Articles"
          href="/articles"
          open={articlesOpen}
          onToggle={() => setArticlesOpen((v) => !v)}
          active={isOnArticles && pathname === '/articles'}
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
        </CollapsibleNav>

        {showAdminSection && (
          <>
            <SectionLabel>Super Admin Only</SectionLabel>

            <NavLink
              href="/settings"
              label="Settings"
              active={pathname === '/settings'}
            />

            <CollapsibleNav
              label="Access Control"
              open={accessCtrlOpen}
              onToggle={() => setAccessCtrlOpen((v) => !v)}
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
            </CollapsibleNav>
          </>
        )}
      </nav>

      {/* ── User footer ─────────────────────────────────────────────────── */}
      <UserMenu />
    </aside>
  )
}