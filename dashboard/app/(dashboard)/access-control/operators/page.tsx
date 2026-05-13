import { createDirectus, rest, staticToken, readUsers, readItems } from '@directus/sdk'
import { OperatorsTab } from './_components/OperatorsTab'
import { auth }         from '@/lib/auth'
import type { OperatorUser } from './_actions'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(staticToken(process.env.DIRECTUS_STATIC_TOKEN!))
  .with(rest())

async function fetchOperators(): Promise<OperatorUser[]> {
  try {
    return (await adminDirectus.request(
      readUsers({
        fields: ['id', 'email', 'organisation_name', 'avatar', 'status', 'role.id', 'role.name'],
        limit:  -1,
        sort:   ['organisation_name'],
      })
    )) as OperatorUser[]
  } catch (err) {
    console.error('[AccessControl] fetchOperators failed:', err)
    return []
  }
}

async function fetchEventCount(): Promise<number> {
  try {
    const rows = (await adminDirectus.request(
      readItems('events' as any, { fields: ['id'], limit: -1 })
    )) as Array<{ id: string }>
    return rows.length
  } catch {
    return 0
  }
}

export default async function OperatorsPage() {
  const session = await auth()

  const [operators, eventCount] = await Promise.all([
    fetchOperators(),
    fetchEventCount(),
  ])

  return (
    <OperatorsTab
      initialOperators={operators}
      currentUserId={session!.user.directusId}
      eventCount={eventCount}
    />
  )
}