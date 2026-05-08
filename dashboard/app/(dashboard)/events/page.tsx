'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/hooks/useRouter'
import { readItems, aggregate } from '@directus/sdk'
import { ExternalLink } from 'lucide-react'
import { directus } from '@/lib/directus'
import type { Event, EventStatus } from '@/types/directus'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day:      'numeric',
  month:    'long',
  year:     'numeric',
  timeZone: 'Asia/Jakarta',
}

type EventRow = Event & {
  participantCount:  number
  institutionCount:  number
  storyCount:        number
}

type AggRow = { count: { id: string }; event_id: string }

function fmtDate(val: unknown): string {
  const d = val as string | null
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', DATE_OPTIONS)
}

function toEventCountMap(rows: AggRow[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) {
    if (row.event_id) result[row.event_id] = Number(row.count.id)
  }
  return result
}

export default function EventsPage() {
  const router = useRouter()
  const [eventRows, setEventRows] = useState<EventRow[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [events, institutionAgg, storyAgg] = await Promise.all([
          directus.request(
            readItems('events', {
              fields: ['id', 'name', 'slug', 'status', 'start_date', 'end_date', 'registration_end_date'],
              sort:   ['-created_at'],
            })
          ),
          directus.request(
            aggregate('institutions', {
              aggregate: { count: ['id'] },
              groupBy:   ['event_id'],
            })
          ),
          directus.request(
            aggregate('news', {
              aggregate: { count: ['id'] },
              groupBy:   ['event_id'],
            })
          ),
        ])

        const institutionsByEvent = toEventCountMap(institutionAgg as AggRow[])
        const storiesByEvent      = toEventCountMap(storyAgg as AggRow[])

        let participantsByEvent: Record<string, number> = {}
        try {
          const participants = (await directus.request(
            readItems('participants', {
              fields: ['competition_category_id.event_id'] as unknown as string[],
              limit:  -1,
            })
          )) as { competition_category_id: { event_id: string } | null }[]

          for (const p of participants) {
            const eid = p.competition_category_id?.event_id
            if (eid) participantsByEvent[eid] = (participantsByEvent[eid] ?? 0) + 1
          }
        } catch {
          // gagal ambil data peserta, ditampilkan 0
        }

        setEventRows(
          (events as Event[]).map((e) => ({
            ...e,
            participantCount: participantsByEvent[e.id] ?? 0,
            institutionCount: institutionsByEvent[e.id] ?? 0,
            storyCount:       storiesByEvent[e.id]      ?? 0,
          }))
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div>
      <div className="-mx-6 -mt-6">
        <PageHeader
          breadcrumbs={[{ label: 'Events' }]}
          title="Events"
          actions={
            <Button onClick={() => router.push('/events/new')}>
              New Event <ExternalLink size={14} className="ml-1.5" />
            </Button>
          }
        />
      </div>
      <div className="pt-3">
        <DataTable<EventRow>
          caption="Your Events"
          count={eventRows.length}
          countLabel="events"
          data={eventRows}
          loading={loading}
          onRowClick={(row) => router.push(`/events/${row.slug}/matches`)}
          columns={[
            { key: 'name',                  label: 'Event Title' },
            { key: 'registration_end_date', label: 'Closed Regis',        render: fmtDate },
            { key: 'start_date',            label: 'Start',                render: fmtDate },
            { key: 'end_date',              label: 'End',                  render: fmtDate },
            { key: 'participantCount',      label: 'Total Participants',   render: (val) => `${val as number} Participants` },
            { key: 'institutionCount',      label: 'Total Institutions',   render: (val) => `${val as number} Institutions` },
            { key: 'storyCount',            label: 'Total Stories',        render: (val) => `${val as number} Stories` },
            { key: 'status', label: 'Status', className: 'text-right', render: (val) => <StatusBadge status={val as EventStatus} /> },
          ]}
        />
      </div>
    </div>
  )
}