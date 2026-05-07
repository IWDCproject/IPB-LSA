'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { directus } from '@/lib/directus'
import { readItems } from '@directus/sdk'
import type { MatchType } from '@/types/directus'
import { Search } from 'lucide-react'
import { createMatchAction } from './_actions'

// --- Types -----------------------------------------------------

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
}

// --- Komponen Utama --------------------------------------------

export function AddMatchModal({ isOpen, onClose, eventId, onSuccess }: AddMatchModalProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [participants, setParticipants] = useState<ParticipantOption[]>([])

  // Form states
  const [categoryId, setCategoryId] = useState('')
  const [matchName, setMatchName] = useState('')
  const [round, setRound] = useState('')
  const [venue, setVenue] = useState('')
  
  // Pisah state tanggal dan waktu (Drumroller style)
  const [datePart, setDatePart] = useState('')
  const [hourPart, setHourPart] = useState('10')
  const [minPart, setMinPart] = useState('00')

  // Participant states
  const [participantA, setParticipantA] = useState('')
  const [participantB, setParticipantB] = useState('')
  const [participantSolo, setParticipantSolo] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const matchType = selectedCategory?.matchType

  useEffect(() => {
    if (!isOpen) return
    const fetchCategories = async () => {
      try {
        const res = await directus.request(
          readItems('competition_categories', {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name', 'format_id.match_type'] as any,
          })
        )
        const mapped = res.map((c: any) => ({
          id: c.id,
          name: c.name,
          matchType: c.format_id?.match_type || 'open',
        }))
        setCategories(mapped)
      } catch (err) {
        console.error('Gagal mengambil kategori', err)
      }
    }
    fetchCategories()
  }, [isOpen, eventId])

  useEffect(() => {
    if (!categoryId) {
      setParticipants([])
      return
    }
    const fetchParticipants = async () => {
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
      } catch (err) {
        console.error('Gagal mengambil partisipan', err)
      }
    }
    fetchParticipants()
    setParticipantA('')
    setParticipantB('')
    setParticipantSolo('')
    setSelectedIds([])
  }, [categoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !venue || !datePart) return
    
    setLoading(true)
    try {
      const combinedIso = new Date(`${datePart}T${hourPart}:${minPart}:00`).toISOString()

      const payload: any = {
        competition_category_id: categoryId,
        match_name: matchName || null,
        round: round || null,
        venue,
        scheduled_at: combinedIso,
        home_participant_id: null,
        away_participant_id: null,
      }

      if (matchType === 'head_to_head') {
        payload.home_participant_id = participantA || null
        payload.away_participant_id = participantB || null
      } else if (matchType === 'solo') {
        payload.home_participant_id = participantSolo || null
      } else if (matchType === 'open') {
        payload.participant_ids = selectedIds
      }

      const res = await createMatchAction(payload)

      if (res.success) {
        onSuccess()
        handleClose()
      } else {
        alert(res.error)
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCategoryId('')
    setMatchName('')
    setRound('')
    setVenue('')
    setDatePart('')
    setHourPart('10')
    setMinPart('00')
    onClose()
  }

  const toggleOpenParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  const toggleAllOpenParticipants = () => {
    if (selectedIds.length === participants.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(participants.map((p) => p.id))
    }
  }

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.institutionName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Styling helpers
  const inputBase = "flex h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
  const selectBase = `${inputBase} pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white p-6 shadow-xl border border-zinc-200 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add a Match</DialogTitle>
          <DialogDescription className="hidden">Membuat match baru berdasarkan format kategori</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Category*</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={selectBase}
              >
                <option value="" disabled className="text-zinc-400">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Scheduled at*</label>
              <div className="flex gap-2">
                {/* Kalender */}
                <div className="relative flex-1">
                  <input
                    required
                    type="date"
                    value={datePart}
                    onChange={(e) => setDatePart(e.target.value)}
                    className={`${inputBase} [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                  />
                </div>

                {/* Time Spinner (Drumroll) */}
                <div className="flex items-center px-2 bg-zinc-50 border border-zinc-200 rounded-lg gap-1">
                  <select 
                    value={hourPart} 
                    onChange={(e) => setHourPart(e.target.value)}
                    className="bg-transparent text-sm font-bold outline-none cursor-pointer p-1"
                  >
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-bold text-zinc-400">:</span>
                  <select 
                    value={minPart} 
                    onChange={(e) => setMinPart(e.target.value)}
                    className="bg-transparent text-sm font-bold outline-none cursor-pointer p-1"
                  >
                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Match Name</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="e.g. Performance #1"
                className={inputBase}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Round</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. Final, Top 10"
                className={inputBase}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Venue*</label>
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

          <hr className="border-zinc-200" />

          {/* Participant Selectors */}
          {matchType && (
            <div className="space-y-4">
              {matchType !== 'open' ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase text-zinc-900">Pilih Participant</h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded">Optional</span>
                </div>
              ) : null}

              {matchType === 'head_to_head' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Contestant A</label>
                    <select
                      value={participantA}
                      onChange={(e) => setParticipantA(e.target.value)}
                      className={selectBase}
                    >
                      <option value="" className="text-zinc-400">- Kosongkan -</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === participantB}>
                          {p.institutionName} – {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Contestant B</label>
                    <select
                      value={participantB}
                      onChange={(e) => setParticipantB(e.target.value)}
                      className={selectBase}
                    >
                      <option value="" className="text-zinc-400">- Kosongkan -</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === participantA}>
                          {p.institutionName} – {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {matchType === 'solo' && (
                <div className="space-y-1.5 w-full md:w-1/2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Contestant</label>
                  <select
                    value={participantSolo}
                    onChange={(e) => setParticipantSolo(e.target.value)}
                    className={selectBase}
                  >
                    <option value="" className="text-zinc-400">- Kosongkan -</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.institutionName} – {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {matchType === 'open' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-zinc-400" />
                      <h3 className="text-sm font-bold uppercase text-zinc-900">Select Participants ({selectedIds.length})</h3>
                    </div>
                    <Button type="button" variant="noBorder" onClick={toggleAllOpenParticipants} className="text-xs font-bold h-8">
                      Select All ({participants.length})
                    </Button>
                  </div>

                  <input
                    type="text"
                    placeholder={`Search ${participants.length} participants...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputBase} h-11`}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {filteredParticipants.map((p) => {
                      const isSelected = selectedIds.includes(p.id)
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleOpenParticipant(p.id)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            isSelected ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg scale-[0.98]' : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-900'
                          }`}
                        >
                          <div className="text-sm font-bold truncate">{p.name}</div>
                          <div className={`text-xs truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-400 font-medium'}`}>
                            {p.institutionName}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200">
            <Button type="button" variant="noBorder" onClick={handleClose} className="font-bold text-zinc-500">
              Cancel
            </Button>
            <Button type="submit" variant="filled" disabled={loading} className="min-w-[120px] font-bold">
              {loading ? 'Saving...' : 'Add Match'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}