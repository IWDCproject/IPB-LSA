'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { UserMenu } from './UserMenu'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Trophy,
  Newspaper,
  Users,
  ScrollText,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  superAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '/',                          icon: <LayoutDashboard className="size-4" /> },
  { label: 'Events',         href: '/events',                    icon: <Trophy className="size-4" /> },
  { label: 'Articles',       href: '/articles',                  icon: <Newspaper className="size-4" /> },
  { label: 'Operators',      href: '/access-control/operators',  icon: <Users className="size-4" />, superAdminOnly: true },
  { label: 'Activity Logs',  href: '/access-control/activity-logs', icon: <ScrollText className="size-4" />, superAdminOnly: true },
]

export function Sidebar() {
  const pathname             = usePathname()
  const { isSuperAdmin }     = useRole()

  const visibleItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin)

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="px-4 py-4 border-b">
        <p className="text-sm font-semibold">IPB LSA</p>
        <p className="text-xs text-muted-foreground">Admin Dashboard</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {visibleItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {isSuperAdmin && (
          <p className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Access Control
          </p>
        )}
      </nav>

      <UserMenu />
    </aside>
  )
}