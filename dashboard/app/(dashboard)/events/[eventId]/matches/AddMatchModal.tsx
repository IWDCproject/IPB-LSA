'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { directus } from '@/lib/directus'
import { readItems } from '@directus/sdk'
import type { MatchType } from '@/types/directus'
import { createMatchAction, updateMatchAction } from './_actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// --- Types -------------------------------------------------------------------

type CategoryOption = {
  id: string
  name: string
  matchType: MatchType
}

type ParticipantOption = {
  id: string
  name: string
  institutionName: string
}

type AddMatchModalProps = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
  matchToEdit?: any | null
}

// --- Shared field styles ------------------------------------------------------

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-zinc-400'

// Chevron SVG encoded inline - right-padded so icon never clips the border
const chevronSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")"

const inputBase =
  'h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 placeholder:italic focus:border-zinc-900 focus:bg-white'

const selectBase = [
  inputBase,
  'appearance-none pr-9',
  `bg-[image:${chevronSvg}]`,
  'bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat',
].join(' ')

// --- Component ----------------------------------------------------------------

export function AddMatchModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  matchToEdit,
}: AddMatchModalProps) {
  const [loading, setLoading]       = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [participants, setParticipants] = useState<ParticipantOption[]>([])

  // Form state
  const [categoryId, setCategoryId]     = useState('')
  const [matchName, setMatchName]       = useState('')
  const [round, setRound]               = useState('')
  const [venue, setVenue]               = useState('')
  const [datePart, setDatePart]         = useState('')
  const [hourPart, setHourPart]         = useState('10')
  const [minPart, setMinPart]           = useState('00')
  const [participantA, setParticipantA] = useState('')
  const [participantB, setParticipantB] = useState('')
  const [participantSolo, setParticipantSolo] = useState('')
  const [selectedIds, setSelectedIds]   = useState<string[]>([])
  const [searchQuery, setSearchQuery]   = useState('')

  // Refs for date picker + time auto-advance
  const dateRef = useRef<HTMLInputElement>(null)
  const hourRef = useRef<HTMLInputElement>(null)
  const minRef  = useRef<HTMLInputElement>(null)

  // Time input helpers - digits only, auto-advance, clamp on blur
  const handleHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setHourPart(raw)
    if (raw.length === 2) minRef.current?.focus()
  }, [])
  const handleHourBlur = useCallback(() => {
    if (!hourPart) { setHourPart('00'); return }
    const n = Math.min(parseInt(hourPart, 10), 23)
    setHourPart(n.toString().padStart(2, '0'))
  }, [hourPart])

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setMinPart(raw)
  }, [])
  const handleMinBlur = useCallback(() => {
    if (!minPart) { setMinPart('00'); return }
    const n = Math.min(parseInt(minPart, 10), 59)
    setMinPart(n.toString().padStart(2, '0'))
  }, [minPart])

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const matchType        = selectedCategory?.matchType

  // 1. Fetch categories
  useEffect(() => {
    if (!isOpen) return
    const fetch = async () => {
      try {
        const res = await directus.request(
          readItems('competition_categories', {
            filter: { event_id: { slug: { _eq: eventId } } },
            fields:['id', 'name', 'format_id.match_type'] as any,
          })
        )
        setCategories(
          res.map((c: any) => ({
            id: c.id,
            name: c.name,
            matchType: c.format_id?.match_type || 'open',
          }))
        )
      } catch (err) {
        console.error('Gagal mengambil kategori', err)
      }
    }
    fetch()
  }, [isOpen, eventId])

  // 2. Pre-fill for edit
  useEffect(() => {
    if (!isOpen) return
    if (matchToEdit) {
      const toId = (v: any) => (v && typeof v === 'object' ? v.id : v) || ''
      
      setCategoryId(toId(matchToEdit.competition_category_id))
      setMatchName(matchToEdit.match_name || '')
      setRound(matchToEdit.round || '')
      setVenue(matchToEdit.venue || '')
      if (matchToEdit.scheduled_at) {
        const d = new Date(matchToEdit.scheduled_at)
        if (!isNaN(d.getTime())) {
          const y  = d.getFullYear()
          const mo = String(d.getMonth() + 1).padStart(2, '0')
          const dy = String(d.getDate()).padStart(2, '0')
          setDatePart(`${y}-${mo}-${dy}`)
          setHourPart(d.getHours().toString().padStart(2, '0'))
          setMinPart(d.getMinutes().toString().padStart(2, '0'))
        } else { setDatePart(''); setHourPart('10'); setMinPart('00') }
      } else { setDatePart(''); setHourPart('10'); setMinPart('00') }
      setParticipantA(toId(matchToEdit.home_participant_id))
      setParticipantB(toId(matchToEdit.away_participant_id))
      setParticipantSolo(toId(matchToEdit.home_participant_id))
      const pids = matchToEdit.participants?.map((p: any) => toId(p.participant_id)).filter(Boolean) ||[]
      setSelectedIds(pids)
    } else {
      setCategoryId(''); setMatchName(''); setRound(''); setVenue('')
      setDatePart(''); setHourPart('10'); setMinPart('00')
      setParticipantA(''); setParticipantB(''); setParticipantSolo('')
      setSelectedIds([])
    }
  }, [isOpen, matchToEdit])

  // 3. Fetch participants when category changes
  useEffect(() => {
    if (!categoryId) { setParticipants([]); return }
    const fetch = async () => {
      try {
        const res = await directus.request(
          readItems('participants', {
            filter: { competition_category_id: { _eq: categoryId } },
            fields: ['id', 'name', 'institution_id.name'] as any,
            limit: -1,
          })
        )
        setParticipants(
          res.map((p: any) => ({
            id: p.id,
            name: p.name,
            institutionName: p.institution_id?.name || 'Unknown',
          }))
        )
        const isEditingSameCategory =
          matchToEdit && matchToEdit.competition_category_id?.id === categoryId
        if (!isEditingSameCategory) {
          setParticipantA(''); setParticipantB('')
          setParticipantSolo(''); setSelectedIds([])
        }
      } catch (err) {
        console.error('Gagal mengambil partisipan', err)
      }
    }
    fetch()
  }, [categoryId, matchToEdit])

  const handleClose = () => {
    setCategoryId(''); setMatchName(''); setRound(''); setVenue('')
    setDatePart(''); setHourPart('10'); setMinPart('00')
    setParticipantA(''); setParticipantB(''); setParticipantSolo('')
    setSelectedIds([])
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !venue || !datePart) return
    setLoading(true)
    try {
      const combinedIso = new Date(`${datePart}T${hourPart}:${minPart}:00`).toISOString()
      const payload: any = {
        eventSlug: eventId,
        competition_category_id: categoryId,
        match_name: matchName || null,
        round: round || null,
        venue,
        scheduled_at: combinedIso,
      }
      if (matchType === 'head_to_head') {
        payload.home_participant_id = participantA || null
        payload.away_participant_id = participantB || null
      } else if (matchType === 'solo') {
        payload.home_participant_id = participantSolo || null
        payload.away_participant_id = null
      } else if (matchType === 'open') {
        payload.participant_ids = selectedIds
      }
      const res = matchToEdit
        ? await updateMatchAction(matchToEdit.id, payload)
        : await createMatchAction(payload)
      if (res.success) { onSuccess(); handleClose() }
      else alert(res.error)
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  const toggleOpenParticipant = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id])

  const toggleAllOpenParticipants = () =>
    setSelectedIds(selectedIds.length === participants.length ? [] : participants.map((p) => p.id))

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.institutionName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {/* -- Header -- */}
        <DialogHeader>
          <DialogTitle>
            {matchToEdit ? 'Edit Match' : 'Add a Match'}
          </DialogTitle>
          <DialogDescription>
            Lengkapi informasi pertandingan di bawah ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* -- Main Info -- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Category */}
            <div className="space-y-1.5">
              <label className={labelCls}>Category *</label>
              <Select
                required
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="- Select Category -" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled At */}
            <div className="space-y-1.5">
              <label className={labelCls}>Scheduled At *</label>
              <div className="flex gap-2">
                {/* Date - clicking anywhere opens the calendar via showPicker() */}
                <input
                  ref={dateRef}
                  required
                  type="date"
                  value={datePart}
                  onChange={(e) => setDatePart(e.target.value)}
                  onClick={() => { try { dateRef.current?.showPicker() } catch {} }}
                  onFocus={() => { try { dateRef.current?.showPicker() } catch {} }}
                  className={`${inputBase} flex-1 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute`}
                />

                {/* Time - two plain text inputs, auto-advance on 2 digits */}
                <div className="flex items-center gap-1 px-3 rounded-lg border border-zinc-200 bg-zinc-50 transition-all focus-within:border-zinc-900 focus-within:bg-white">
                  <input
                    ref={hourRef}
                    type="text"
                    inputMode="numeric"
                    value={hourPart}
                    onChange={handleHourChange}
                    onBlur={handleHourBlur}
                    placeholder="HH"
                    maxLength={2}
                    className="w-7 bg-transparent text-sm font-bold text-zinc-900 outline-none text-center placeholder:text-zinc-300 placeholder:italic"
                  />
                  <span className="text-zinc-300 font-bold select-none">:</span>
                  <input
                    ref={minRef}
                    type="text"
                    inputMode="numeric"
                    value={minPart}
                    onChange={handleMinChange}
                    onBlur={handleMinBlur}
                    placeholder="MM"
                    maxLength={2}
                    className="w-7 bg-transparent text-sm font-bold text-zinc-900 outline-none text-center placeholder:text-zinc-300 placeholder:italic"
                  />
                </div>
              </div>
            </div>

            {/* Match Name */}
            <div className="space-y-1.5">
              <label className={labelCls}>Match Name</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="e.g. Performance #1"
                className={inputBase}
              />
            </div>

            {/* Round */}
            <div className="space-y-1.5">
              <label className={labelCls}>Round</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. Final, Top 10"
                className={inputBase}
              />
            </div>

            {/* Venue */}
            <div className="space-y-1.5 md:col-span-2">
              <label className={labelCls}>Venue *</label>
              <input
                required
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="GOR Simatupang"
                className={inputBase}
              />
            </div>
          </div>

          {/* -- Divider -- */}
          <hr className="border-zinc-100" />

          {/* -- Participant Selectors -- */}
          {matchType && (
            <div className="space-y-4">
              {matchType !== 'open' && (
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Pilih Participant</label>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                    Optional
                  </span>
                </div>
              )}

              {/* Head to Head */}
              {matchType === 'head_to_head' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Contestant A', value: participantA, onChange: setParticipantA, disabledId: participantB },
                    { label: 'Contestant B', value: participantB, onChange: setParticipantB, disabledId: participantA },
                  ].map(({ label, value, onChange, disabledId }) => (
                    <div key={label} className="space-y-1.5">
                      <label className={labelCls}>{label}</label>
                      <Select
                        value={value}
                        onValueChange={onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="- Kosongkan -" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">- Kosongkan -</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={p.id === disabledId}>
                              {p.institutionName} – {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Solo */}
              {matchType === 'solo' && (
                <div className="space-y-1.5 md:w-1/2">
                  <label className={labelCls}>Contestant</label>
                  <Select
                    value={participantSolo}
                    onValueChange={setParticipantSolo}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="- Kosongkan -" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">- Kosongkan -</SelectItem>
                      {participants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.institutionName} – {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Open / Multi-select */}
              {matchType === 'open' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>
                      Select Participants ({selectedIds.length})
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllOpenParticipants}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      {selectedIds.length === participants.length ? 'Clear All' : `Select All (${participants.length})`}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder={`Search ${participants.length} participants…`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={inputBase}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {filteredParticipants.map((p) => {
                      const isSelected = selectedIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleOpenParticipant(p.id)}
                          className={`text-left rounded-lg border p-3 transition-all ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300'
                          }`}
                        >
                          <div className="text-sm font-bold truncate">{p.name}</div>
                          <div className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                            {p.institutionName}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -- Footer -- */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
            <Button type="button" variant="noBorder" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" disabled={loading} className="min-w-28">
              {loading ? 'Saving...' : (matchToEdit ? 'Save Changes' : 'Add Match')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}