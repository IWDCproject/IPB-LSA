'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useRole } from '@/hooks/useRole'

export function UserMenu() {
  const { data: session } = useSession()
  const { isSuperAdmin }  = useRole()

  if (!session) return null

  const email    = session.user.email ?? ''
  const name     = session.user.name
  const initials = (name ?? email ?? '?').slice(0, 2).toUpperCase()
  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : (session.user.organisationName ?? name ?? email)

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      {/* Avatar */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold select-none">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={name ?? email}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{roleLabel}</p>
        <p className="text-xs text-muted-foreground leading-tight truncate">{email}</p>
      </div>

      {/* Sign out */}
      <Button
        variant="noBorder"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}