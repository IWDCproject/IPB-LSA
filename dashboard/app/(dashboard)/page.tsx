import { PageHeader } from '@/components/layout/PageHeader'

export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['Dashboard']}
        title="Jadwal Hari Ini"
      />
      <p className="text-sm text-muted-foreground">Coming soon — Phase 8.</p>
    </div>
  )
}