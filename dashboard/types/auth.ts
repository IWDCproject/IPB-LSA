import type { DefaultSession } from 'next-auth'
import type { UserRole } from './directus'

export type DashboardSession = {
  user: {
    directusId: string
    email: string
    role: UserRole
    organisationName: string | null
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      directusId: string
      role: UserRole
      organisationName: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    directusId?: string
    role?: UserRole
    organisationName?: string | null
  }
}