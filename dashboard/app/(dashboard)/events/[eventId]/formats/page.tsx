'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { readItems, deleteItem } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { useDirectusFetch } from '@/hooks/useDirectusFetch'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MatchFormat, FormatModule, MatchType } from '@/types/directus'

// --- Konstanta -------------------------------------------------

const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  head_to_head: 'Head to Head',
  solo:         'Solo',
  open:         'Open',
}

const ENGINE_LABEL: Record<string, string> = {
  score_timed:  'Score Timed',
  score_sets:   'Score Sets',
  judge_scores: 'Judge Scores',
  finish_time:  'Finish Time',
  manual_pick:  'Manual Pick',
}

// --- Helpers ---------------------------------------------------

function moduleLabel(mod: FormatModule): string {
  if (mod.type === 'notes') return 'Notes'
  if (mod.type === 'timer') return `Timer (${mod.config.mode})`
  return ENGINE_LABEL[mod.type] ?? mod.type
}

// --- Komponen kecil --------------------------------------------

function ModuleBadges({ modules }: { modules: FormatModule[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {modules.map((mod, i) => (
        <Badge key={i} variant="secondary" className="text-xs font-medium">
          {moduleLabel(mod)}
        </Badge>
      ))}
    </div>
  )
}

// --- Komponen utama --------------------------------------------

export default function FormatsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router      = useRouter()

  // tick dipake buat trigger refetch setelah delete
  const [tick, setTick] = useState(0)

  const { data: formats, loading, error } = useDirectusFetch<MatchFormat[]>(
    () => directus.request(readItems('match_formats', {
      filter: { event_id: { _eq: eventId } },
      sort:   ['name'],
    })) as Promise<MatchFormat[]>,
    [eventId, tick]
  )

  async function handleDelete(formatId: string) {
    await directus.request(deleteItem('match_formats', formatId))
    setTick((t) => t + 1)
  }

  const columns = [
    {
      key:   'name' as keyof MatchFormat,
      label: 'Format Name',
    },
    {
      key:    'match_type' as keyof MatchFormat,
      label:  'Match Type',
      render: (val: MatchFormat[keyof MatchFormat] | undefined) =>
        MATCH_TYPE_LABEL[val as MatchType] ?? String(val ?? ''),
    },
    {
      key:    'modules' as keyof MatchFormat,
      label:  'Modules',
      render: (val: MatchFormat[keyof MatchFormat] | undefined) =>
        <ModuleBadges modules={(val as FormatModule[]) ?? []} />,
    },
    {
      key:       '_actions' as const,
      label:     '',
      className: 'w-0',
      render:    (_: MatchFormat[keyof MatchFormat] | undefined, row: MatchFormat) => (
        <div className="flex items-center gap-2">
          <Button
            variant="noBorder"
            
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/events/${eventId}/formats/builder?formatId=${row.id}`)
            }}
          >
            Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="noBorder"
                
                className="text-red-500 hover:text-red-600 "
                onClick={(e) => e.stopPropagation()}
              >
                Delete
              </Button>
            }
            title="Hapus format?"
            description={`"${row.name}" akan dihapus permanen dan dilepas dari semua kategori yang menggunakannya.`}
            confirmLabel="Delete"
            onConfirm={() => handleDelete(row.id)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable<MatchFormat>
        columns={columns}
        data={formats ?? []}
        loading={loading}
        caption="Match Formats"
        count={formats?.length ?? 0}
        countLabel="formats"
      />

      <div className="flex justify-end">
        <Button onClick={() => router.push(`/events/${eventId}/formats/builder`)}>
          Add Format
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500">Gagal memuat data format.</p>
      )}
    </div>
  )
}