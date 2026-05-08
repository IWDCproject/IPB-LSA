'use client'

import { useState, useEffect, useCallback } from 'react'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
import { createParticipantAction, updateParticipantAction } from '../_actions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

// --- Types -------------------------------------------------------------------

type InstitutionOption = { id: string; name: string }
type CategoryOption    = { id: string; name: string; participant_type: 'individual' | 'team' }

type Member = { id: string; name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
  preselectedCategoryId?: string
  editingParticipant?: {
    id: string
    name: string
    competition_category_id: string
    institution_id?: string | null
    institution?: { id: string; name: string } | null
    notes: string
    members?: Array<{ name: string }> | null
  } | null
}

// --- Shared field styles -----------------------------------------------------

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-zinc-400'

const inputCls =
  'mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white'

// --- Helpers -----------------------------------------------------------------

const makeId = () => Math.random().toString(36).slice(2)

// --- Sub-component: Team Members Editor --------------------------------------

function TeamMembersEditor({
  members,
  onChange,
}: {
  members: Member[]
  onChange: (members: Member[]) => void
}) {
  const [newName, setNewName]       = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const addMember = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onChange([...members, { id: makeId(), name: trimmed }])
    setNewName('')
  }

  const startEdit = (m: Member) => {
    setEditingId(m.id)
    setEditingName(m.name)
  }

  const commitEdit = () => {
    const trimmed = editingName.trim()
    if (!trimmed) return
    onChange(members.map(m => m.id === editingId ? { ...m, name: trimmed } : m))
    setEditingId(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const removeMember = (id: string) => {
    onChange(members.filter(m => m.id !== id))
  }

  return (
    <div>
      <label className={labelCls}>Anggota Tim</label>

      {/* Add row */}
      <div className="mt-1.5 flex gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember() } }}
          placeholder="Nama anggota"
        />
        <button
          type="button"
          onClick={addMember}
          disabled={!newName.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Members list */}
      {members.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {members.map((m, idx) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
            >
              {/* Index badge */}
              <span className="w-5 shrink-0 text-center text-[10px] font-bold text-zinc-400">
                {idx + 1}
              </span>

              {editingId === m.id ? (
                /* Inline edit mode */
                <>
                  <input
                    autoFocus
                    className="h-7 flex-1 rounded border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                      if (e.key === 'Escape') cancelEdit()
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitEdit}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                /* View mode */
                <>
                  <span className="flex-1 text-sm font-semibold text-zinc-800 truncate">
                    {m.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {members.length === 0 && (
        <p className="mt-2 text-center text-xs text-zinc-400 py-2">
          Belum ada anggota. Tambahkan di atas.
        </p>
      )}
    </div>
  )
}

// --- Main Component ----------------------------------------------------------

export default function AddParticipantModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  preselectedCategoryId,
  editingParticipant,
}: Props) {
  const [name, setName]                   = useState('')
  const [institutionId, setInstitutionId] = useState<string>('')
  const [categoryId, setCategoryId]       = useState<string>(preselectedCategoryId || '')
  const [notes, setNotes]                 = useState('')
  const [members, setMembers]             = useState<Member[]>([])
  const [saving, setSaving]               = useState(false)
  const [institutions, setInstitutions]   = useState<InstitutionOption[]>([])
  const [categories, setCategories]       = useState<CategoryOption[]>([])

  // Derived: currently selected category
  const selectedCategory = categories.find(c => c.id === categoryId) ?? null
  const isTeam = selectedCategory?.participant_type === 'team'

  // Fetch reference data
  // FIX: filter by slug (eventId from params is a slug, not a UUID)
  useEffect(() => {
    if (!isOpen) return
    const fetchData = async () => {
      const [insts, cats] = await Promise.all([
        directus.request(
          readItems('institutions', {
            filter: { event_id: { slug: { _eq: eventId } } },
            fields: ['id', 'name'],
            limit: -1,
          })
        ),
        directus.request(
          readItems('competition_categories', {
            filter: { event_id: { slug: { _eq: eventId } } },
            // FIX: also fetch participant_type so we can conditionally render the form
            fields: ['id', 'name', 'participant_type'],
            sort: ['display_order'],
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
      if (editingParticipant) {
        // Edit mode: populate fields
        setName(editingParticipant.name)
        setInstitutionId(editingParticipant.institution?.id || editingParticipant.institution_id || '')
        setCategoryId(editingParticipant.competition_category_id)
        setNotes(editingParticipant.notes || '')
        // Convert members if present
        if (editingParticipant.members && editingParticipant.members.length > 0) {
          setMembers(editingParticipant.members.map(m => ({ id: makeId(), name: m.name })))
        } else {
          setMembers([])
        }
      } else {
        // Create mode: reset fields
        setName('')
        setInstitutionId('')
        setNotes('')
        setMembers([])
        setCategoryId(preselectedCategoryId || '')
      }
    }
  }, [isOpen, preselectedCategoryId, editingParticipant])

  // Also reset members when category type changes
  useEffect(() => {
    setMembers([])
  }, [categoryId])

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
      const payload = {
        competition_category_id: categoryId,
        institution_id: (!institutionId || institutionId === 'none') ? null : institutionId,
        name: name.trim(),
        notes: notes.trim() || '',
        // For team participants, pass members array (stripped of internal ids)
        members: isTeam ? members.map(m => ({ name: m.name })) : null,
      }
      
      const res = editingParticipant 
        ? await updateParticipantAction(editingParticipant.id, payload)
        : await createParticipantAction(payload)
        
      if (res.success) { onSuccess(); onClose() }
      else alert(res.error)
    } catch (error) {
      console.error('Failed to save participant:', error)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = !!name.trim() && !!categoryId && !saving

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">

        {/* -- Header -- */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-bold text-zinc-900">
            {editingParticipant ? 'Edit Peserta' : 'Tambah Peserta'}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {isTeam
              ? 'Isi nama tim dan daftar anggota.'
              : editingParticipant 
                ? 'Ubah data peserta.'
                : 'Tambahkan peserta ke kategori yang dipilih.'}
          </p>
        </div>

        {/* -- Body (scrollable) -- */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Kategori */}
          <div>
            <label className={labelCls}>Kategori</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1.5 h-10 rounded-lg border-zinc-200 bg-zinc-50 pr-4 text-sm font-semibold focus:border-zinc-900 focus:bg-white transition-all [&>span]:truncate">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span>{c.name}</span>
                    <span className="ml-2 text-[10px] text-zinc-400 font-normal">
                      ({c.participant_type === 'team' ? 'Tim' : 'Individu'})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nama — label changes based on type */}
          <div>
            <label className={labelCls}>
              {isTeam ? 'Nama Tim' : 'Nama Peserta'}
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTeam ? 'Nama tim' : 'Nama peserta'}
            />
          </div>

          {/* Team members — only shown when participant_type is team */}
          {isTeam && (
            <TeamMembersEditor members={members} onChange={setMembers} />
          )}

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
        <div className="px-6 pb-5 pt-4 border-t border-zinc-100 flex justify-end gap-2 shrink-0">
          <Button variant="noBorder" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? 'Menyimpan...' : (editingParticipant ? 'Perbarui' : 'Simpan')}
          </Button>
        </div>

      </div>
    </div>
  )
}