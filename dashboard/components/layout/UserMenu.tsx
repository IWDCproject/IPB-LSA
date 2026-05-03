'use client'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function UserMenu() {
  const { data: session } = useSession()

  if (!session) return null

  const displayName = session.user.name ?? session.user.email
  const initials    = (displayName ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-t">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        {session.user.organisationName && (
          <p className="text-xs text-muted-foreground truncate">
            {session.user.organisationName}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}