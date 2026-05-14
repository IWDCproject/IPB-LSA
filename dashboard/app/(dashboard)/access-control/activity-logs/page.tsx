import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActivityLogs } from './_actions'
import { ActivityLogsTab } from './_components/ActivityLogsTab'

export default async function ActivityLogsPage() {
  const session = await auth()
  
  if (!session || session.user.role !== 'SuperAdmin') {
    redirect('/dashboard') // Or some other safe place
  }

  const result = await getActivityLogs()
  const logs = result.success ? result.data : []

  return (
    <ActivityLogsTab initialLogs={logs} />
  )
}