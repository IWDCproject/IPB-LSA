// lib/auth.ts
import 'server-only'
import NextAuth, { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createDirectus, rest, staticToken, readUsers } from '@directus/sdk'
import { redirect } from 'next/navigation'
import { authConfig } from './auth.config'
import type { UserRole } from '@/types/directus'
import { ROLES } from './constants'

// SDK Khusus Server untuk cek database saat login
const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

type DirectusUserRow = {
  id: string
  role: { name: string } | string
  organisation_name: string | null
}

/**
 * Mapping Role dari Directus ke Dashboard
 */
function toUserRole(roleName: string): UserRole {
  // Jika di Directus namanya Administrator atau SuperAdmin, jadikan SuperAdmin di app
  if (roleName === ROLES.SUPER_ADMIN || roleName === ROLES.ADMINISTRATOR) return 'SuperAdmin'
  return 'PJ Ormawa'
}

function extractRoleName(role: DirectusUserRow['role']): string {
  if (typeof role === 'object' && role !== null) return role.name
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

    /**
     * Jalur Pertama: Cek apakah email user terdaftar di Directus
     */
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
      } catch (error) {
        console.error('Auth SignIn Error:', error)
        return false
      }
    },

    /**
     * Jalur Kedua: Ambil data Role & ID dari Directus, simpan di JWT
     */
    async jwt({ token, account }: { token: any; account: any }) {
      // Hanya jalankan fetch data Directus saat pertama kali login (account ada)
      if (account && token.email) {
        try {
          const rows = (await adminDirectus.request(
            readUsers({
              filter: { email: { _eq: token.email } },
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
        } catch (error) {
          console.error('Auth JWT Error:', error)
        }
      }
      return token
    },

    /**
     * Jalur Ketiga (PENTING): Memindahkan data dari JWT ke Session 
     * agar bisa dibaca oleh helper auth() di Server Action
     */
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.directusId = token.directusId
        session.user.role = token.role
        session.user.organisationName = token.organisationName
      }
      return session
    },
  },
}

// Handler untuk API Route /api/auth/[...nextauth]
const handler = NextAuth(authOptions)
export const handlers = { GET: handler, POST: handler }

/**
 * Helper Utama: Gunakan ini di Server Actions atau Server Components
 */
export const auth = () => getServerSession(authOptions)

/**
 * Helper Sign In
 */
export async function signIn(provider: string, options?: { redirectTo?: string }) {
  const params = new URLSearchParams()
  if (options?.redirectTo) params.set('callbackUrl', options.redirectTo)
  redirect(`/api/auth/signin/${provider}?${params}`)
}

export default handler