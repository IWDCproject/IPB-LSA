import { auth } from '@/lib/auth'
import { createItem } from '@directus/sdk'
import { adminDirectus } from './directus-admin'

interface LogActivityParams {
  action: string
  entity: string
  entityId?: string | null
  description: string
  eventId?: string | null
}

/**
 * Logs an activity to the platform-wide audit trail (activity_logs table).
 * This function is non-fatal; failures are logged to console but do not throw.
 */
export async function logActivity({
  action,
  entity,
  entityId = null,
  description,
  eventId = null,
}: LogActivityParams) {
  try {
    const session = await auth()
    const actorId = session?.user?.directusId

    if (!actorId) {
      console.warn('[ActivityLog] No authenticated user found in session. Skipping log.')
      return
    }

    await adminDirectus.request(
      createItem('activity_logs' as any, {
        user_id: actorId,
        event_id: eventId,
        action,
        entity,
        entity_id: entityId,
        description,
      })
    )
  } catch (err) {
    console.error('[ActivityLog] Write failed (non-fatal):', err)
  }
}
