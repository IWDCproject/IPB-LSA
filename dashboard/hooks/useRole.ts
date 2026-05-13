'use client'

import { useSession } from 'next-auth/react'

type UseRoleReturn = {
  isSuperAdmin: boolean
  canManage: (eventUserCreatedId: string) => boolean
}

export function useRole(): UseRoleReturn {
  const { data: session } = useSession()

  const isSuperAdmin =
    session?.user.role === 'SuperAdmin' ||
    session?.user.role === 'Administrator'

  return {
    isSuperAdmin,
    canManage: (eventUserCreatedId: string) =>
      isSuperAdmin || session?.user.directusId === eventUserCreatedId,
  }
}