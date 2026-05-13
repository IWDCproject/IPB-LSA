import { redirect }            from 'next/navigation'
import { auth }                from '@/lib/auth'
import { AccessControlHeader } from './_components/AccessControlHeader'

export default async function AccessControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user)                     redirect('/login')
  if (session.user.role !== 'SuperAdmin') redirect('/')

  return (
    <div className="flex flex-col min-h-full">
      <AccessControlHeader />
      <div className="pt-0 flex-1">{children}</div>
    </div>
  )
}