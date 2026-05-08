'use client'

import { useState, useEffect, useCallback } from 'react'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { createParticipantAction } from '../_actions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// --- Types -------------------------------------------------------------------

type InstitutionOption = { id: string; name: string }
type CategoryOption    = { id: string; name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
  preselectedCategoryId?: string
}

// --- Shared field styles ------------------------------------------------------

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-zinc-400'

const inputCls =
  'mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white'

// --- Component ----------------------------------------------------------------

export default function AddParticipantModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  preselectedCategoryId,
}: Props) {
  const [name, setName]               = useState('')
  const [institutionId, setInstitutionId] = useState<string>('')
  const [categoryId, setCategoryId]   = useState<string>(preselectedCategoryId || '')
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
  const [categories, setCategories]   = useState<CategoryOption[]>([])

  // Fetch reference data
  useEffect(() => {
    if (!isOpen) return
    const fetchData = async () => {
      const [insts, cats] = await Promise.all([
        directus.request(
          readItems('institutions', {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name'],
            limit: -1,
          })
        ),
        directus.request(
          readItems('competition_categories', {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name'],
            limit: -1,
          })
        ),
      ])
      setInstitutions(insts as InstitutionOption[])
      setCategories(cats as CategoryOption[])
    }
    fetchData()
  }, [isOpen, eventId])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setName('')
      setInstitutionId('')
      setNotes('')
      setCategoryId(preselectedCategoryId || '')
    }
  }, [isOpen, preselectedCategoryId])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  const handleSubmit = async () => {
    if (!name.trim() || !categoryId) return
    setSaving(true)
    try {
      const res = await createParticipantAction({
        competition_category_id: categoryId,
        institution_id: (!institutionId || institutionId === 'none') ? null : institutionId,
        name: name.trim(),
        notes: notes.trim() || '',
      })
      if (res.success) { onSuccess(); onClose() }
      else alert(res.error)
    } catch (error) {
      console.error('Failed to add participant:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">

        {/* -- Header -- */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">Tambah Peserta</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Tambahkan peserta ke kategori yang dipilih.
          </p>
        </div>

        {/* -- Body -- */}
        <div className="px-6 py-5 space-y-4">

          {/* Kategori */}
          <div>
            <label className={labelCls}>Kategori</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1.5 h-10 rounded-lg border-zinc-200 bg-zinc-50 pr-4 text-sm font-semibold focus:border-zinc-900 focus:bg-white transition-all [&>span]:truncate">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nama */}
          <div>
            <label className={labelCls}>Nama Peserta</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama peserta atau tim"
            />
          </div>

          {/* Institusi */}
          <div>
            <label className={labelCls}>Institusi</label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger className="mt-1.5 h-10 rounded-lg border-zinc-200 bg-zinc-50 pr-4 text-sm font-semibold focus:border-zinc-900 focus:bg-white transition-all [&>span]:truncate">
                <SelectValue placeholder="Pilih institusi (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa institusi</SelectItem>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div>
            <label className={labelCls}>Catatan</label>
            <input
              className={inputCls}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        {/* -- Footer -- */}
        <div className="px-6 pb-5 pt-4 border-t border-zinc-100 flex justify-end gap-2">
          <Button variant="noBorder" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !categoryId}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>

      </div>
    </div>
  )
}