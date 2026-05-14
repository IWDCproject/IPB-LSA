'use server'

import { auth } from '@/lib/auth'
import { adminDirectus } from '@/lib/directus-admin'
import { readItems } from '@directus/sdk'

export type ActivityLog = {
  id: string
  created_at: string
  action: string
  entity: string
  entity_id: string | null
  description: string
  user_id: {
    organisation_name: string | null
    email: string
  }
  event_id: {
    id: string
    name: string
    slug: string
  } | null
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function getActivityLogs(params?: { 
  limit?: number; 
  offset?: number 
}): Promise<ActionResult<ActivityLog[]>> {
  const session = await auth()
  if (!session || session.user.role !== 'SuperAdmin') {
    return { success: false, error: 'Unauthorized' }
  }

  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0

  try {
    const logs = await adminDirectus.request(
      readItems('activity_logs' as any, {
        fields: [
          'id',
          'created_at',
          'action',
          'entity',
          'entity_id',
          'description',
          'user_id.organisation_name',
          'user_id.email',
          'event_id.id',
          'event_id.name',
          'event_id.slug',
        ],
        sort: ['-created_at'],
        limit,
        offset,
      })
    ) as unknown as ActivityLog[]

    return { success: true, data: logs }
  } catch (err) {
    console.error('[getActivityLogs]', err)
    return { success: false, error: 'Failed to fetch activity logs' }
  }
}
