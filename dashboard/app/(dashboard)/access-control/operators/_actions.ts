'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { adminDirectus } from '@/lib/directus-admin'
import { logActivity } from '@/lib/activity'
import { readUsers, readRoles, createUser, updateUser, deleteUser } from '@directus/sdk'
import { z } from 'zod'

const REVALIDATE_PATH = '/access-control/operators'

// -- Shared result type --------------------------------------------------------
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// -- Internal types ------------------------------------------------------------
type RoleKey = 'super_admin' | 'operator'

type DirectusRole = { id: string; name: string }

type DirectusUserRaw = {
  id: string
  email: string
  organisation_name: string | null
  avatar: string | null   // Directus file UUID → /assets/<uuid>
  status: 'active' | 'inactive' | 'suspended' | 'invited' | 'draft'
  role: { id: string; name: string } | string | null
}

export type OperatorUser = DirectusUserRaw

// -- Security guard -------------------------------------------------------------
async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) throw new Error('NOT_AUTHENTICATED')
  if (session.user.role !== 'SuperAdmin') throw new Error('FORBIDDEN')
  return session
}

// -- Input validation schemas --------------------------------------------------
// Zod v4: use `message` (not `errorMap`), and `.issues` (not `.errors`)
const orgNameField = z
  .string()
  .min(1, 'Nama organisasi wajib diisi.')
  .max(100, 'Nama terlalu panjang (max 100 karakter).')
  .trim()
  .refine(v => !/[<>"'`]/.test(v), { message: 'Nama mengandung karakter yang tidak diizinkan.' })

const emailField = z
  .string()
  .email('Format email tidak valid.')
  .max(254, 'Email terlalu panjang.')
  .toLowerCase()
  .trim()

// Zod v4 enum: plain `message` string, no `errorMap`
const roleField = z.enum(['super_admin', 'operator'], {
  message: 'Pilih role yang valid.',
})

const uuidField = z.string().uuid('ID pengguna tidak valid.')

const createSchema = z.object({
  organisationName: orgNameField,
  email: emailField,
  role: roleField,
})

const updateSchema = z.object({
  organisationName: orgNameField,
  role: roleField,
})

// -- Role map helper ------------------------------------------------------------
async function getRoleMap(): Promise<Record<RoleKey, string>> {
  const roles = (await adminDirectus.request(
    readRoles({ fields: ['id', 'name'], limit: -1 })
  )) as DirectusRole[]

  const adminRole = roles.find(r => r.name === 'Administrator' || r.name === 'SuperAdmin')
  const operatorRole = roles.find(r => r.name === 'PJ Ormawa')

  if (!adminRole) throw new Error('Role "Administrator" tidak ditemukan di Directus.')
  if (!operatorRole) throw new Error('Role "PJ Ormawa" tidak ditemukan di Directus.')

  return { super_admin: adminRole.id, operator: operatorRole.id }
}


// -- Last-SuperAdmin lockout guard ---------------------------------------------
async function assertNotLastSuperAdmin(
  targetId: string,
  roleMap: Record<RoleKey, string>,
  context: 'demote' | 'disable' | 'delete',
): Promise<ActionResult> {
  const [target] = (await adminDirectus.request(
    readUsers({ filter: { id: { _eq: targetId } }, fields: ['role.id'], limit: 1 })
  )) as Array<{ role: { id: string } | string | null }>

  const targetRoleId =
    typeof target?.role === 'object' && target.role !== null
      ? target.role.id
      : (target?.role as string | null)

  if (targetRoleId !== roleMap.super_admin) return { success: true }

  const filter: Record<string, unknown> = {
    role: { _eq: roleMap.super_admin },
    status: { _eq: 'active' },
  }
  if (context !== 'delete') filter['id'] = { _neq: targetId }

  const remaining = (await adminDirectus.request(
    readUsers({ filter: filter as any, fields: ['id'], limit: -1 })
  )) as Array<{ id: string }>

  if (remaining.length === 0) {
    const verbMap = { demote: 'mendegradasi', disable: 'menonaktifkan', delete: 'menghapus' }
    return { success: false, error: `Tidak bisa ${verbMap[context]} Super Admin terakhir yang aktif.` }
  }

  return { success: true }
}

// ============================================================================
// Public read
// ============================================================================

export async function getOperators(): Promise<ActionResult<OperatorUser[]>> {
  try { await requireSuperAdmin() }
  catch { return { success: false, error: 'Akses ditolak.' } }

  try {
    const users = (await adminDirectus.request(
      readUsers({
        fields: ['id', 'email', 'organisation_name', 'status', 'role.id', 'role.name'],
        limit: -1,
        sort: ['organisation_name'],
      })
    )) as OperatorUser[]
    return { success: true, data: users }
  } catch (err) {
    console.error('[getOperators]', err)
    return { success: false, error: 'Gagal mengambil data operator.' }
  }
}

// ============================================================================
// Create
// ============================================================================

export async function createAccount(formData: FormData): Promise<ActionResult> {
  let session: Awaited<ReturnType<typeof requireSuperAdmin>>
  try { session = await requireSuperAdmin() }
  catch { return { success: false, error: 'Akses ditolak.' } }

  const parsed = createSchema.safeParse({
    organisationName: formData.get('organisationName'),
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues.at(0)

    return {
      success: false,
      error: firstIssue?.message ?? "Validation failed",
    }
  }

  const { organisationName, email, role } = parsed.data

  try {
    const existing = (await adminDirectus.request(
      readUsers({ filter: { email: { _eq: email } }, fields: ['id'], limit: 1 })
    )) as Array<{ id: string }>

    if (existing.length > 0) {
      return { success: false, error: 'Akun dengan email ini sudah terdaftar.' }
    }

    const roleMap = await getRoleMap()

    await adminDirectus.request(
      createUser({
        email,
        organisation_name: organisationName,
        role: roleMap[role],
        status: 'active',
        // Random password — login is Google OAuth only; this password is never used
        password: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
      } as any)
    )

    await logActivity({
      action: 'create_account',
      entity: 'directus_users',
      description: `Membuat akun "${email}" sebagai ${role === 'super_admin' ? 'Super Admin' : 'Operator'}`,
    })

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (err) {
    console.error('[createAccount]', err)
    return { success: false, error: 'Gagal membuat akun. Silakan coba lagi.' }
  }
}

// ============================================================================
// Update
// ============================================================================

export async function updateAccount(
  userId: string,
  formData: FormData,
): Promise<ActionResult> {
  let session: Awaited<ReturnType<typeof requireSuperAdmin>>
  try { session = await requireSuperAdmin() }
  catch { return { success: false, error: 'Akses ditolak.' } }

  const idCheck = uuidField.safeParse(userId)
  if (!idCheck.success) return { success: false, error: 'ID pengguna tidak valid.' }

  const parsed = updateSchema.safeParse({
    organisationName: formData.get('organisationName'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues.at(0)

    return {
      success: false,
      error: firstIssue?.message ?? "Validation failed",
    }
  }

  const { organisationName, role } = parsed.data

  if (userId === session.user.directusId && role === 'operator') {
    return { success: false, error: 'Kamu tidak bisa menurunkan role akunmu sendiri.' }
  }

  try {
    const roleMap = await getRoleMap()

    if (role === 'operator') {
      const lockout = await assertNotLastSuperAdmin(userId, roleMap, 'demote')
      if (!lockout.success) return lockout
    }

    await adminDirectus.request(
      updateUser(userId, {
        organisation_name: organisationName,
        role: roleMap[role],
      } as any)
    )

    await logActivity({
      action: 'update_account',
      entity: 'directus_users',
      entityId: userId,
      description: `Memperbarui akun ${userId}: nama="${organisationName}", role=${role}`,
    })

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (err) {
    console.error('[updateAccount]', err)
    return { success: false, error: 'Gagal memperbarui akun. Silakan coba lagi.' }
  }
}

// ============================================================================
// Toggle access
// ============================================================================

export async function toggleAccess(
  userId: string,
  enable: boolean,
): Promise<ActionResult> {
  let session: Awaited<ReturnType<typeof requireSuperAdmin>>
  try { session = await requireSuperAdmin() }
  catch { return { success: false, error: 'Akses ditolak.' } }

  const idCheck = uuidField.safeParse(userId)
  if (!idCheck.success) return { success: false, error: 'ID pengguna tidak valid.' }

  if (!enable && userId === session.user.directusId) {
    return { success: false, error: 'Kamu tidak bisa menonaktifkan akunmu sendiri.' }
  }

  try {
    if (!enable) {
      const roleMap = await getRoleMap()
      const lockout = await assertNotLastSuperAdmin(userId, roleMap, 'disable')
      if (!lockout.success) return lockout
    }

    await adminDirectus.request(
      updateUser(userId, { status: enable ? 'active' : 'inactive' } as any)
    )

    await logActivity({
      action: enable ? 'enable_account' : 'disable_account',
      entity: 'directus_users',
      entityId: userId,
      description: `${enable ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${userId}`,
    })

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (err) {
    console.error('[toggleAccess]', err)
    return { success: false, error: 'Gagal mengubah status akun. Silakan coba lagi.' }
  }
}

// ============================================================================
// Delete
// ============================================================================

export async function deleteAccount(userId: string): Promise<ActionResult> {
  let session: Awaited<ReturnType<typeof requireSuperAdmin>>
  try { session = await requireSuperAdmin() }
  catch { return { success: false, error: 'Akses ditolak.' } }

  const idCheck = uuidField.safeParse(userId)
  if (!idCheck.success) return { success: false, error: 'ID pengguna tidak valid.' }

  if (userId === session.user.directusId) {
    return { success: false, error: 'Kamu tidak bisa menghapus akunmu sendiri.' }
  }

  try {
    const roleMap = await getRoleMap()
    const lockout = await assertNotLastSuperAdmin(userId, roleMap, 'delete')
    if (!lockout.success) return lockout

    const [target] = (await adminDirectus.request(
      readUsers({ filter: { id: { _eq: userId } }, fields: ['email'], limit: 1 })
    )) as Array<{ email: string }>

    await adminDirectus.request(deleteUser(userId))

    await logActivity({
      action: 'delete_account',
      entity: 'directus_users',
      description: `Menghapus akun "${target?.email ?? userId}"`,
    })

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (err) {
    console.error('[deleteAccount]', err)
    return { success: false, error: 'Gagal menghapus akun. Silakan coba lagi.' }
  }
}