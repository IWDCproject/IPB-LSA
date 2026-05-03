import type { NextAuthOptions } from 'next-auth'
import type { UserRole } from '@/types/directus'

export const authConfig: NextAuthOptions = {
  providers: [],
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, token }) {
      session.user.directusId       = (token.directusId as string) ?? ''
      session.user.role             = (token.role ?? 'operator') as UserRole
      session.user.organisationName = (token.organisationName as string | null) ?? null
      return session
    },
  },
}