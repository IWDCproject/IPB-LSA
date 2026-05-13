import 'server-only'
import NextAuth, { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createDirectus, rest, staticToken, readUsers } from '@directus/sdk'
import { redirect } from 'next/navigation'
import { authConfig } from './auth.config'
import type { UserRole } from '@/types/directus'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

type DirectusUserRow = {
  id: string
  role: { name: string } | string
  organisation_name: string | null
}

function toUserRole(roleName: string): UserRole {
  if (roleName === 'superadmin') return 'super_admin'
  return 'operator'
}

function extractRoleName(role: DirectusUserRow['role']): string {
  if (typeof role === 'object') return role.name
  return ''
}

export const authOptions = {
  ...authConfig,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }: { user: { email?: string | null } }) {
      if (!user.email) return false
      try {
        const rows = (await adminDirectus.request(
          readUsers({
            filter: { email: { _eq: user.email } },
            fields: ['id'],
            limit: 1,
          })
        )) as unknown as DirectusUserRow[]
        return rows.length > 0
      } catch {
        return false
      }
    },

    async jwt({ token, account }: { token: any; account: any }) {
      if (!account) return token

      try {
        const rows = (await adminDirectus.request(
          readUsers({
            filter: { email: { _eq: token.email as string } },
            fields: ['id', 'role.name', 'organisation_name'],
            limit: 1,
          })
        )) as unknown as DirectusUserRow[]

        const directusUser = rows[0]
        if (directusUser) {
          token.directusId       = directusUser.id
          token.role             = toUserRole(extractRoleName(directusUser.role))
          token.organisationName = directusUser.organisation_name
        }
      } catch {
        // Token tetap ada tapi tanpa directusId/role
      }

      return token
    },
  },
}

// Named exports agar kompatibel dengan import di seluruh app
const handler = NextAuth(authOptions)
export const handlers = { GET: handler, POST: handler }

export const auth = () => getServerSession(authOptions)

export async function signIn(provider: string, options?: { redirectTo?: string }) {
  const params = new URLSearchParams()
  if (options?.redirectTo) params.set('callbackUrl', options.redirectTo)
  redirect(`/api/auth/signin/${provider}?${params}`)
}

export default handler