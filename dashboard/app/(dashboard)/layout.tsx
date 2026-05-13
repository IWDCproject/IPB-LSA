import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-zinc-100">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden bg-white my-2 mr-2 ml-2 rounded-xl shadow-sm">
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}