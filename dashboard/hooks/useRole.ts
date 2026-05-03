'use client'

import { useSession } from 'next-auth/react'

type UseRoleReturn = {
  isSuperAdmin: boolean
  canManage: (eventUserCreatedId: string) => boolean
}

export function useRole(): UseRoleReturn {
  const { data: session } = useSession()

  const isSuperAdmin = session?.user.role === 'super_admin'

  return {
    isSuperAdmin,
    canManage: (eventUserCreatedId: string) =>
      isSuperAdmin || session?.user.directusId === eventUserCreatedId,
  }
}