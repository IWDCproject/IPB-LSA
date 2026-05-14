// app/(dashboard)/events/[eventId]/formats/page.tsx
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
import { Plus, Trash2, SquarePen } from 'lucide-react'

import { CategoryDialog } from '@/components/modals/CategoryModal'
import { 
  upsertCategoryAction, 
  deleteCategoryAction,
  deleteFormatAction
} from './_actions'

import type { CompetitionCategory, MatchFormat, FormatModule, MatchType, ParticipantType } from '@/types/directus'

// --- Konstanta ---
const MATCH_TYPE_LABEL: Record<MatchType, string> = { head_to_head: 'Head to Head', solo: 'Solo', open: 'Open' }
const PARTICIPANT_TYPE_LABEL: Record<ParticipantType, string> = { individual: 'Individual', team: 'Team' }
const ENGINE_LABEL: Record<string, string> = { score_timed: 'Score Timed', score_sets: 'Score Sets', judge_scores: 'Judge Scores', finish_time: 'Finish Time', manual_pick: 'Manual Pick' }

// --- Helpers ---
function moduleLabel(mod: FormatModule) {
  if (mod.type === 'notes') return 'Notes'
  if (mod.type === 'timer') return `Timer`
  return ENGINE_LABEL[mod.type] ?? mod.type
}

export default function FormatsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()
  const [tick, setTick] = useState(0)
  const refetch = () => setTick(t => t + 1)

  // --- Data Fetch ---
  const { data: formats, loading: loadingFormats } = useDirectusFetch<MatchFormat[]>(
    () => directus.request(readItems('match_formats', { filter: { event_id: { slug: { _eq: eventId } } }, sort: ['name'] })) as Promise<MatchFormat[]>,
    [eventId, tick]
  )

  const { data: categories, loading: loadingCategories } = useDirectusFetch<CompetitionCategory[]>(
    () => directus.request(readItems('competition_categories', { filter: { event_id: { slug: { _eq: eventId } } }, sort: ['display_order', 'name'] })) as Promise<CompetitionCategory[]>,
    [eventId, tick]
  )

  // --- Category Modal State ---
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CompetitionCategory | null>(null)

  const openAdd = () => { setEditTarget(null); setDialogOpen(true) }
  const openEdit = (c: CompetitionCategory) => { setEditTarget(c); setDialogOpen(true) }

  const handleSaveCategory = async (data: any) => {
    const res = await upsertCategoryAction({
      id: editTarget?.id,
      event_id: eventId,
      ...data,
      format_id: data.format_id || null
    })
    if (res.success) refetch()
    return res
  }

  const handleDeleteCategory = async (id: string) => {
    const res = await deleteCategoryAction(id)
    if (res.success) refetch()
    else alert(res.error)
  }

  const handleDeleteFormat = async (id: string) => {
    const res = await deleteFormatAction(id)
    if (res.success) refetch()
    else alert(res.error)
  }

  const formatMap = new Map(formats?.map(f => [f.id, f]) ?? [])

  return (
    <div className="space-y-10 mt-[-20px]">

      {/* --- Section Format --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Match Formats</h2>
          <Button onClick={() => router.push(`/events/${eventId}/formats/builder`)}>Tambah Format<Plus className=" h-4 w-4" /></Button>
        </div>
        
        <DataTable<MatchFormat>
          columns={[
            { key: 'name', label: 'Nama Format' },
            { key: 'match_type', label: 'Match Type', render: (v) => MATCH_TYPE_LABEL[v as MatchType] },
            { 
              key: 'modules', label: 'Modules', 
              render: (v) => (
                <span className="text-sm text-zinc-700">
                  {(v as FormatModule[]).map((m) => `[${moduleLabel(m)}]`).join(' ')}
                </span>
              ) 
            },
            {
              key: '_actions', label: '', className: 'w-0',
              render: (_, row) => (
                <div className="flex items-center justify-end gap-3">
                  <div 
                    onClick={() => router.push(`/events/${eventId}/formats/builder?formatId=${row.id}`)}
                    className="flex items-center text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer text-sm font-bold"
                  >
                    Edit <SquarePen className="ml-1.5 h-3.5 w-3.5" />
                  </div>
                  <ConfirmDialog
                    trigger={
                      <div className="flex items-center text-red-500 hover:text-red-700 transition-colors cursor-pointer text-sm font-bold">
                        Hapus <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                      </div>
                    }
                    title="Delete Format"
                    description={`Are you sure you want to delete "${row.name}"? This will only work if the format is not used by any categories.`}
                    onConfirm={() => handleDeleteFormat(row.id)}
                  />
                </div>
              )
            }
          ]}
          data={formats ?? []}
          loading={loadingFormats}
          count={formats?.length}
          countLabel="formats"
          caption="Match Formats"
        />
        <p className="text-xs text-zinc-400 mt-2">Format pertandingan menentukan modul, sistem penilaian, dan aturan penyelesaian skor.</p>
      </div>

      {/* --- Section Kategori --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Kategori Kompetisi</h2>
          <Button onClick={openAdd}>Tambah Kategori<Plus className=" h-4 w-4" /></Button>
        </div>
        
        <DataTable<CompetitionCategory>
          columns={[
            { key: 'name', label: 'Nama Kategori' },
            { key: 'participant_type', label: 'Tipe', render: (v) => PARTICIPANT_TYPE_LABEL[v as ParticipantType] },
            { 
              key: 'format_id', 
              label: 'Format', 
              render: (v) => {
                const fmt = formatMap.get(v as string)
                if (!fmt) return <span className="text-zinc-400 font-normal text-xs italic">Belum ditentukan</span>
                return (
                  <div className="flex items-center gap-2">
                    <span>{fmt.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{MATCH_TYPE_LABEL[fmt.match_type]}</Badge>
                  </div>
                )
              }
            },
            {
              key: '_actions', label: '', className: 'w-0',
              render: (_, row) => (
                <div className="flex items-center justify-end gap-3">
                  <div 
                    onClick={() => openEdit(row)}
                    className="flex items-center text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer text-sm font-bold"
                  >
                    Edit <SquarePen className="ml-1.5 h-3.5 w-3.5" />
                  </div>
                  <ConfirmDialog
                    trigger={
                      <div className="flex items-center text-red-500 hover:text-red-700 transition-colors cursor-pointer text-sm font-bold">
                        Hapus <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                      </div>
                    }
                    title="Delete Category"
                    description={`Are you sure you want to delete "${row.name}"? All participants and matches in this category will be inaccessible.`}
                    onConfirm={() => handleDeleteCategory(row.id)}
                  />
                </div>
              )
            }
          ]}
          data={categories ?? []}
          loading={loadingCategories}
          count={categories?.length}
          countLabel="kategori"
          caption="Kategori Kompetisi"
        />
        <p className="text-xs text-zinc-400 mt-2">Kategori kompetisi untuk event ini, setiap kategori ditetapkan satu format pertandingan.</p>
      </div>

      

      <CategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        formats={formats ?? []}
        editCategory={editTarget}
        onSave={handleSaveCategory}
      />
    </div>
  )
}