'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { readItem, readItems, createItem, updateItem } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { useFormatBuilder } from '@/stores/formatBuilder'
import {
  LeftSidebar,
  CenterConfigPanel,
} from '@/components/format-builder/BuilderPanels'
import { FormatPreview } from '@/components/format-builder/FormatPreview'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MatchFormat, Match } from '@/types/directus'
import { upsertFormatAction } from '../_actions' 

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FormatBuilderPage() {
  const { eventId }   = useParams<{ eventId: string }>()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const formatId      = searchParams.get('formatId')

  const {
    formatName,
    setFormatName,
    buildModulesPayload,
    loadFromExisting,
    reset,
    matchType,
  } = useFormatBuilder()

  const [saving,      setSaving]      = useState(false)
  const [loadingInit, setLoadingInit] = useState(!!formatId)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [liveMatches, setLiveMatches] = useState<Match[]>([])

  useEffect(() => {
    reset()
    if (!formatId) return
    setLoadingInit(true)
    directus
      .request(readItem('match_formats', formatId))
      .then((f) => loadFromExisting(f as MatchFormat))
      .catch(() => setSaveError('Gagal memuat format.'))
      .finally(() => setLoadingInit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId])

  async function checkLiveMatches(): Promise<Match[]> {
    if (!formatId) return []
    const categories = await directus.request(
      readItems('competition_categories', {
        filter: { format_id: { _eq: formatId } },
        fields: ['id'],
      })
    )
    if (!categories.length) return []
    const categoryIds = (categories as { id: string }[]).map((c) => c.id)
    const liveList = await directus.request(
      readItems('matches', {
        filter: {
          competition_category_id: { _in: categoryIds },
          status: { _eq: 'live' },
        },
        fields: ['id', 'match_name', 'status'],
        limit: 5,
      })
    )
    return liveList as Match[]
  }

  async function handleSave() {
    if (!formatName.trim()) {
      setSaveError('Nama format tidak boleh kosong.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const modules = buildModulesPayload()
      
      // PANGGIL ACTION, BUKAN directus.request
      const res = await upsertFormatAction({
        id: formatId || undefined,
        event_id: eventId,
        name: formatName.trim(),
        match_type: matchType,
        modules: modules
      })

      if (res.success) {
        router.push(`/events/${eventId}/formats`)
        router.refresh()
      } else {
        setSaveError(res.error || 'Terjadi kesalahan yang tidak diketahui.')
      }
    } catch (err) {
      setSaveError('Terjadi kesalahan sistem. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveClick() {
    if (!formatId) { await handleSave(); return }
    const live = await checkLiveMatches()
    if (live.length > 0) {
      setLiveMatches(live)
    } else {
      await handleSave()
    }
  }

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-zinc-400">Memuat format...</p>
      </div>
    )
  }

  const isEdit = !!formatId

  return (
    // Full-height 3-column layout: Left | Center | Right
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-r border-zinc-200 bg-white overflow-y-auto">
        <LeftSidebar />
      </div>

      {/* ── Center config ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <CenterConfigPanel />
      </div>

      {/* ── Right preview ────────────────────────────────────────────── */}
      {/*
        IMPORTANT: outer div must NOT have overflow-y-auto — that would make
        the sticky save footer scroll away with the content.
        Only the inner content div scrolls.
      */}
      <div className="w-[380px] shrink-0 flex flex-col h-full border-l border-zinc-200 bg-zinc-50 overflow-hidden">

        {/* Preview header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 bg-white shrink-0">
          <p className="text-sm font-semibold text-zinc-900">Preview</p>
        </div>

        {/* Preview cards — scrollable */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
          <FormatPreview />
        </div>

        {/* Sticky bottom: format name + save — always visible */}
        <div className="border-t border-zinc-200 bg-white p-4 space-y-2 shrink-0">
          {saveError && (
            <p className="text-xs text-red-500">{saveError}</p>
          )}
          <Input
            value={formatName}
            onChange={(e) => setFormatName(e.target.value)}
            placeholder="Format Name"
            className="text-sm"
          />
          {liveMatches.length > 0 ? (
            <ConfirmDialog
              trigger={
                <Button className="w-full" disabled={saving}>
                  {saving ? 'Menyimpan...' : isEdit ? 'Save Format' : 'Add Format'}
                </Button>
              }
              title="Format sedang dipakai di pertandingan live"
              description={`${liveMatches.length} pertandingan sedang live pakai format ini. Perubahan akan langsung berpengaruh ke layar operator. Lanjutkan?`}
              confirmLabel="Simpan Tetap"
              onConfirm={handleSave}
            />
          ) : (
            <Button className="w-full" onClick={handleSaveClick} disabled={saving}>
              {saving ? 'Menyimpan...' : isEdit ? 'Save Format' : 'Add Format'}
            </Button>
          )}
          <button
            onClick={() => router.push(`/events/${eventId}/formats`)}
            className="w-full text-xs text-zinc-500 hover:text-zinc-700 py-1"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}