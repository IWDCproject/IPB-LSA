// app/(dashboard)/events/[eventId]/settings/page.tsx
'use client'

import { useState, useEffect, Fragment, useRef } from 'react'
import { useParams } from 'next/navigation'
import { readItems } from '@directus/sdk'
import { 
  ChevronUp, ChevronDown, Trash2, Save, Plus, 
  User, Link, Instagram, Youtube, Globe, FileText, Mail, ExternalLink,
  Calendar, MapPin, Info, AlignLeft, Eye, Activity, UserPlus, Type,
  Tag, Clock, CheckCircle2, Flag, AlertTriangle, Settings2, ShieldAlert
} from 'lucide-react'

import { directus, getAssetUrl } from '@/lib/directus'
import { useDirectusFetch } from '@/hooks/useDirectusFetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import type { Event, EventPhase } from '@/types/directus'

import {
  updateEventInfoAction,
  updateEventStatusAction,
  saveTimelinePhasesAction,
  deleteEventAction,
  createEventPhaseAction,
  deleteEventPhaseAction,
} from './_actions'

// --- Shared primitives -------------------------------------------------------

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

function FieldGroup({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
        {description && <p className="text-[10px] text-zinc-400 font-medium">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  labelOn: string
  labelOff: string
}) {
  return (
    <div className="flex items-center gap-3 h-9">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          checked ? 'bg-zinc-900' : 'bg-zinc-200',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      <span className="text-sm font-semibold text-zinc-700">{checked ? labelOn : labelOff}</span>
    </div>
  )
}

const DROPZONE_BASE = 'relative group bg-zinc-50 rounded-xl overflow-hidden border-2 border-dashed transition-all flex items-center justify-center cursor-pointer'
const DROPZONE_IDLE = 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100'
const DROPZONE_DRAG = 'border-amber-500 bg-amber-50'

function ImageUpload({
  label,
  file,
  existingUrl,
  isDragging,
  inputRef,
  onFile,
  onDrag,
  onDrop,
  className,
  emptyLabel,
}: {
  label: string
  file: File | null
  existingUrl: string | null | undefined
  isDragging: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onFile: (f: File | null) => void
  onDrag: (e: React.DragEvent, active: boolean) => void
  onDrop: (e: React.DragEvent) => void
  className?: string
  emptyLabel: string
}) {
  const preview = file ? URL.createObjectURL(file) : existingUrl

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={e => onDrag(e, true)}
        onDragOver={e => onDrag(e, true)}
        onDragLeave={e => onDrag(e, false)}
        onDrop={onDrop}
        className={cn(DROPZONE_BASE, isDragging ? DROPZONE_DRAG : DROPZONE_IDLE, className)}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <p className="text-[11px] font-bold text-zinc-400 text-center px-4">{emptyLabel}</p>
        )}
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*"
          onChange={e => onFile(e.target.files?.[0] ?? null)}
        />
        {preview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-[10px] font-bold tracking-widest">CHANGE IMAGE</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-bold transition-all outline-none',
        active
          ? 'border-transparent bg-zinc-900 text-white shadow-md'
          : 'border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100',
      )}
    >
      {children}
    </button>
  )
}

const TEXTAREA   = 'w-full p-3 rounded-lg text-sm bg-zinc-50/50 border border-zinc-200 focus:ring-1 focus:ring-zinc-400 focus:bg-white outline-none resize-none transition-all'
const SELECT     = 'w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm bg-zinc-50/50 outline-none cursor-pointer hover:bg-zinc-100 transition-colors'
const TAB_HEADER = 'flex items-center justify-between'

// --- 1. Info Tab -------------------------------------------------------------

function InfoTab({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm] = useState({
    name:                 event.name || '',
    location:             event.location || '',
    description:          event.description || '',
    start_date:           event.start_date || '',
    end_date:             event.end_date || '',
    slug:                 event.slug || '',
    type:                 event.type || 'sport',
    is_published:         event.is_published ?? false,
    is_registration_open: event.is_registration_open ?? false,
    registration_url:     event.registration_url || '',
    guidebook_url:        event.guidebook_url || '',
    instagram_url:        event.instagram_url || '',
    website_url:          event.website_url   || '',
    url_youtube:          event.url_youtube   || '',
    contact_person_name:  event.contact_person?.[0]?.name  || '',
    contact_person_link:  event.contact_person?.[0]?.link  || '',
    contact_person_email: event.contact_person?.[0]?.email || '',
  })

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [cardFile,   setCardFile]   = useState<File | null>(null)
  const [drag, setDrag] = useState({ banner: false, card: false })

  const bannerRef = useRef<HTMLInputElement>(null)
  const cardRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const bannerUrl = bannerFile ? URL.createObjectURL(bannerFile) : null
    const cardUrl   = cardFile   ? URL.createObjectURL(cardFile)   : null
    return () => {
      if (bannerUrl) URL.revokeObjectURL(bannerUrl)
      if (cardUrl)   URL.revokeObjectURL(cardUrl)
    }
  }, [bannerFile, cardFile])

  const makeDragHandler = (key: 'banner' | 'card') => ({
    onDrag: (e: React.DragEvent, active: boolean) => {
      e.preventDefault(); e.stopPropagation()
      setDrag(d => ({ ...d, [key]: active }))
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation()
      setDrag(d => ({ ...d, [key]: false }))
      const file = e.dataTransfer.files[0]
      if (file) key === 'banner' ? setBannerFile(file) : setCardFile(file)
    },
  })

  const set = (k: keyof typeof form) => (v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, String(v)))
    data.append('eventId', event.id)
    if (bannerFile) data.append('banner_image', bannerFile)
    if (cardFile)   data.append('card_image',   cardFile)
    const res = await updateEventInfoAction(data)
    if (res.success) {
      onRefresh()
    } else {
      setError(res.error ?? 'Gagal menyimpan.')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 pb-12">
      <div className={TAB_HEADER}>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Event Info Settings</h2>
          <p className="text-sm text-zinc-500 mt-1">Kelola identitas dan aset visual event Anda</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <Button variant="filled" onClick={handleSave} disabled={loading} className="h-9 gap-2">
            <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Info'}
          </Button>
        </div>
      </div>

      {/* Core info */}
      <SectionCard title="Informasi Dasar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">

            <FieldGroup label="Nama Event*" description="Nama lengkap kejuaraan/kegiatan">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                  <Type size={12} />
                </div>
                <Input 
                  className="pl-8" 
                  value={form.name} 
                  onChange={e => set('name')(e.target.value)} 
                  placeholder="Contoh: IPB Sport Championship 2024"
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Deskripsi*" description="Ringkasan mengenai event (Markdown didukung)">
              <div className="relative group">
                <div className="absolute top-2.5 left-2.5 pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                  <AlignLeft size={12} />
                </div>
                <textarea
                  className={cn(TEXTAREA, 'h-44 pl-8 pt-2 placeholder:text-zinc-400/50')}
                  value={form.description}
                  onChange={e => set('description')(e.target.value)}
                  placeholder="Tuliskan detail event anda di sini..."
                />
              </div>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Tanggal Mulai*">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <Calendar size={12} />
                  </div>
                  <Input type="date" className="pl-8" value={form.start_date} onChange={e => set('start_date')(e.target.value)} />
                </div>
              </FieldGroup>
              <FieldGroup label="Tanggal Selesai*">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <Calendar size={12} />
                  </div>
                  <Input type="date" className="pl-8" value={form.end_date} onChange={e => set('end_date')(e.target.value)} />
                </div>
              </FieldGroup>
            </div>
          </div>

          <div className="space-y-6">

            <FieldGroup label="Lokasi / Venue*" description="Tempat pelaksanaan event">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                  <MapPin size={12} />
                </div>
                <Input 
                  className="pl-8" 
                  value={form.location} 
                  onChange={e => set('location')(e.target.value)} 
                  placeholder="Gedung Gymnasium IPB, Bogor"
                />
              </div>
            </FieldGroup>

            <div className="space-y-6 pt-2">
              <ImageUpload
                label="Event Banner (Desktop)"
                file={bannerFile}
                existingUrl={getAssetUrl(event.banner_image)}
                isDragging={drag.banner}
                inputRef={bannerRef}
                onFile={setBannerFile}
                emptyLabel="CLICK OR DRAG TO UPLOAD BANNER"
                className="h-36"
                {...makeDragHandler('banner')}
              />

              <ImageUpload
                label="Event Card (Poster)"
                file={cardFile}
                existingUrl={getAssetUrl(event.card_image)}
                isDragging={drag.card}
                inputRef={cardRef}
                onFile={setCardFile}
                emptyLabel="UPLOAD POSTER"
                className="w-28 h-40"
                {...makeDragHandler('card')}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Contact & links */}
      <SectionCard title="Kontak & Tautan">
        <div className="space-y-8">
          {/* Section 1: Official Links & Resources */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <Link size={12} className="text-zinc-400" />
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Tautan & Sumber Daya</h4>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <FieldGroup label="URL Pendaftaran*" description="Link pendaftaran eksternal (Google Form, dll)">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <ExternalLink size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.registration_url} 
                    onChange={e => set('registration_url')(e.target.value)} 
                    placeholder="https://..." 
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="URL Guidebook / TOR" description="Link ke file PDF atau Drive">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <FileText size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.guidebook_url} 
                    onChange={e => set('guidebook_url')(e.target.value)} 
                    placeholder="masukkan link guidebook" 
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="Website Event" description="Homepage resmi event jika ada">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <Globe size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.website_url} 
                    onChange={e => set('website_url')(e.target.value)} 
                    placeholder="https://..." 
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="Slug / URL Halaman Event" description="Nama unik di URL website publik">
                <div className="flex items-center rounded-md border border-input bg-input/10 overflow-hidden focus-within:bg-white focus-within:ring-2 focus-within:ring-ring/30 transition-all">
                  <span className="pl-2.5 pr-1 text-[10px] font-bold text-zinc-400 shrink-0 select-none">/event/</span>
                  <input
                    value={form.slug}
                    onChange={e => set('slug')(e.target.value)}
                    className="flex-1 bg-transparent py-1 pr-3 text-sm outline-none md:text-xs/relaxed"
                  />
                </div>
              </FieldGroup>
            </div>
          </div>

          {/* Section 2: Social Media */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <Instagram size={12} className="text-zinc-400" />
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Media Sosial</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <FieldGroup label="Instagram URL">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-pink-500 transition-colors">
                    <Instagram size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.instagram_url} 
                    onChange={e => set('instagram_url')(e.target.value)} 
                    placeholder="https://instagram.com/..." 
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="YouTube Highlight/Teaser">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-red-500 transition-colors">
                    <Youtube size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.url_youtube} 
                    onChange={e => set('url_youtube')(e.target.value)} 
                    placeholder="https://youtube.com/watch?v=..." 
                  />
                </div>
              </FieldGroup>
            </div>
          </div>
          
          {/* Section 3: Contact Person */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <User size={12} className="text-zinc-400" />
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Narahubung (Contact Person)</h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FieldGroup label="Nama Kontak">
                <Input 
                  value={form.contact_person_name} 
                  onChange={e => set('contact_person_name')(e.target.value)} 
                  placeholder="Nama narahubung"
                />
              </FieldGroup>
              
              <FieldGroup label="Tautan (WhatsApp/Telegram)">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-green-600 transition-colors">
                    <Link size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    value={form.contact_person_link} 
                    onChange={e => set('contact_person_link')(e.target.value)} 
                    placeholder="wa.me/628..." 
                  />
                </div>
              </FieldGroup>

              <FieldGroup label="Alamat Email">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={12} />
                  </div>
                  <Input 
                    className="pl-8" 
                    type="email" 
                    value={form.contact_person_email} 
                    onChange={e => set('contact_person_email')(e.target.value)} 
                    placeholder="email@example.com"
                  />
                </div>
              </FieldGroup>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Status & visibility */}
      <SectionCard title="Status & Visibilitas">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
          <FieldGroup label="Tipe Event*" description="Kategori utama kegiatan">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                <Activity size={12} />
              </div>
              <select value={form.type} onChange={e => set('type')(e.target.value)} className={cn(SELECT, 'pl-8')}>
                <option value="sport">Sport</option>
                <option value="arts">Arts</option>
              </select>
            </div>
          </FieldGroup>

          <FieldGroup label="Visibilitas*" description="Tampilkan di website publik?">
            <div className="flex items-center gap-3 h-7">
              <Eye size={12} className={cn('transition-colors', form.is_published ? 'text-blue-500' : 'text-zinc-400')} />
              <Toggle checked={form.is_published} onChange={set('is_published')} labelOn="Published" labelOff="Draft" />
            </div>
          </FieldGroup>

          <FieldGroup label="Pendaftaran*" description="Status buka/tutup registrasi">
            <div className="flex items-center gap-3 h-7">
              <UserPlus size={12} className={cn('transition-colors', form.is_registration_open ? 'text-green-600' : 'text-zinc-400')} />
              <Toggle checked={form.is_registration_open} onChange={set('is_registration_open')} labelOn="Buka" labelOff="Tutup" />
            </div>
          </FieldGroup>
        </div>
      </SectionCard>
    </div>
  )
}

// --- 2. Timeline Tab ---------------------------------------------------------

const DOT_SIZE = 14
const LINE_Y   = 60
const GAP      = 28

function isYellow(v: string) {
  return ['active', 'current', 'done', 'finished', 'over'].includes(String(v ?? '').toLowerCase())
}

function splitLabel(label: string): [string, string | null] {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [label, null]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function TimelineTab({ eventId, phases, onRefresh }: { eventId: string; phases: EventPhase[]; onRefresh: () => void }) {
  const [loading, setLoading]         = useState(false)
  const [localPhases, setLocalPhases] = useState(phases)

  useEffect(() => { setLocalPhases(phases) }, [phases])

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= localPhases.length) return
    const next = [...localPhases]
    const a = next[index]
    const b = next[swapIndex]
    if (!a || !b) return
    next[index] = b
    next[swapIndex] = a
    setLocalPhases(next)
  }

  const updatePhase = (id: string, patch: Partial<EventPhase>) =>
    setLocalPhases(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)))

  const handleSave = async () => {
    setLoading(true)
    await saveTimelinePhasesAction(eventId, localPhases)
    onRefresh()
    setLoading(false)
  }

  const handleAdd = async () => {
    setLoading(true)
    await createEventPhaseAction(eventId, {
      label:         'New Phase',
      description:   '',
      date_start:    new Date().toISOString().split('T')[0],
      time_start:    '09:00',
      display_order: localPhases.length,
    })
    onRefresh()
    setLoading(false)
  }

  const handleDelete = async (phaseId: string) => {
    if (!confirm('Hapus fase ini?')) return
    setLoading(true)
    await deleteEventPhaseAction(eventId, phaseId)
    onRefresh()
    setLoading(false)
  }

  return (
    <div className="space-y-6 pb-12">
      <div className={cn(TAB_HEADER, 'flex-col sm:flex-row gap-4')}>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Event Timeline Display</h2>
          <p className="text-sm text-zinc-500 mt-1">Preview grafis dan pengaturan detail fase publik</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="default" onClick={handleAdd} disabled={loading} className="h-9 gap-2">
            Add Phase <Plus className="h-4 w-4" />
          </Button>
          <Button variant="filled" onClick={handleSave} disabled={loading} className="h-9 gap-2">
            <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Timeline'}
          </Button>
        </div>
      </div>

      {/* Graph preview */}
      <SectionCard title="Live Preview Graph">
        <div className="relative w-full h-[180px] px-8 md:px-12 pt-8">
          {localPhases.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-zinc-400 italic">Belum ada fase.</span>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Connector lines */}
              {localPhases.map((phase, i) => {
                if (i === localPhases.length - 1) return null
                const next = localPhases[i + 1]
                if (!next) return null
                const x1   = (i / (localPhases.length - 1)) * 100
                const x2   = ((i + 1) / (localPhases.length - 1)) * 100
                const l    = isYellow(phase.status)
                const r    = isYellow(next.status)
                const bg   = l && r ? '#FFC936' : !l && !r ? '#D1D5DB'
                           : l ? 'linear-gradient(to right, #FFC936, #D1D5DB)'
                           :     'linear-gradient(to right, #D1D5DB, #FFC936)'
                return (
                  <div
                    key={`line-${phase.id}`}
                    className="absolute z-[1] rounded-full"
                    style={{ left: `${x1}%`, top: LINE_Y, width: `${x2 - x1}%`, height: 3, transform: 'translateY(-50%)', background: bg }}
                  />
                )
              })}

              {/* Dots & labels */}
              {localPhases.map((phase, i) => {
                const x         = localPhases.length === 1 ? 50 : (i / (localPhases.length - 1)) * 100
                const isTop     = i % 2 === 0
                const done      = isYellow(phase.status)
                const [l1, l2]  = splitLabel(phase.label)
                const translateX = i === 0 ? '0' : i === localPhases.length - 1 ? '-100%' : '-50%'
                const textAlign  = i === 0 ? 'left' : i === localPhases.length - 1 ? 'right' : 'center'

                return (
                  <Fragment key={phase.id}>
                    <div
                      className="absolute w-[120px] pointer-events-none"
                      style={{ left: `${x}%`, top: isTop ? LINE_Y - GAP : LINE_Y + GAP, transform: `translate(${translateX}, ${isTop ? '-100%' : '0'})`, textAlign: textAlign as any }}
                    >
                      <span className={cn('text-[12px] leading-[1.3] block', done ? 'font-extrabold text-zinc-900' : 'font-semibold text-zinc-500')}>
                        {l2 ? <>{l1}<br />{l2}</> : l1}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 mt-1 block">{phase.date_start}</span>
                    </div>
                    <div
                      className="absolute z-[3] rounded-full"
                      style={{ left: `${x}%`, top: LINE_Y, transform: 'translate(-50%, -50%)', width: DOT_SIZE, height: DOT_SIZE, background: done ? '#FFC936' : '#D1D5DB', boxShadow: done ? '0 0 12px 3px rgba(255,201,54,0.45)' : '0 0 8px rgba(209,213,219,0.4)' }}
                    />
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Editable phase list */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-900">Timeline Phase Settings</h3>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Press &quot;Save Timeline&quot; to push all changes
          </span>
        </div>

        <div className="divide-y divide-zinc-100">
          {localPhases.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-10">Belum ada fase. Silakan tambahkan fase baru.</p>
          )}
          {localPhases.map((phase, i) => (
            <div key={phase.id} className="p-6 flex flex-col gap-4 hover:bg-zinc-50/30 transition-colors">
              <div className="flex items-end gap-4">
                {/* Order controls */}
                <div className="flex flex-col gap-1 pb-1">
                  <button onClick={() => handleMove(i, 'up')} disabled={i === 0 || loading} className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleMove(i, 'down')} disabled={i === localPhases.length - 1 || loading} className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <FieldGroup label="Nama Fase*">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Flag size={12} />
                      </div>
                      <Input 
                        value={phase.label} 
                        onChange={e => updatePhase(phase.id, { label: e.target.value })} 
                        className="pl-8 h-7" 
                        placeholder="Contoh: Pembukaan / Final"
                      />
                    </div>
                  </FieldGroup>
                </div>

                <div className="w-40">
                  <FieldGroup label="Status">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <CheckCircle2 size={12} />
                      </div>
                      <select 
                        value={phase.status} 
                        onChange={e => updatePhase(phase.id, { status: e.target.value as any })} 
                        className={cn(SELECT, 'pl-8 h-7')}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </FieldGroup>
                </div>

                <div className="w-32">
                  <FieldGroup label="Tanggal Mulai*">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Calendar size={12} />
                      </div>
                      <Input 
                        type="date" 
                        value={phase.date_start} 
                        onChange={e => updatePhase(phase.id, { date_start: e.target.value })} 
                        className="pl-8 h-7" 
                      />
                    </div>
                  </FieldGroup>
                </div>

                <div className="w-24">
                  <FieldGroup label="Waktu">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Clock size={12} />
                      </div>
                      <Input 
                        type="time" 
                        value={phase.time_start || '09:00'} 
                        onChange={e => updatePhase(phase.id, { time_start: e.target.value })} 
                        className="pl-8 h-7" 
                      />
                    </div>
                  </FieldGroup>
                </div>

                <div className="pb-0.5">
                  <Button
                    variant="noBorder"
                    className="h-7 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 p-0 rounded-lg"
                    onClick={() => handleDelete(phase.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pl-11">
                <FieldGroup label="Deskripsi Fase" description="Opsional: detail mengenai fase ini (lokasi, syarat, dsb)...">
                <div className="relative group">
                  <div className="absolute top-2.5 left-2.5 pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                    <AlignLeft size={12} />
                  </div>
                  <textarea
                    placeholder="Contoh: Dilaksanakan di GOR Pajajaran, Bogor..."
                    className={cn(TEXTAREA, 'h-20 text-[13px] pl-8 pt-2 placeholder:text-zinc-400/50')}
                    value={phase.description || ''}
                    onChange={e => updatePhase(phase.id, { description: e.target.value })}
                  />
                </div>
              </FieldGroup>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- 3. Danger Tab -----------------------------------------------------------

function DangerTab({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState<Event['status']>(event.status)

  const handleSaveStatus = async () => {
    setLoading(true)
    await updateEventStatusAction(event.id, status)
    onRefresh()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Apakah anda yakin ingin menghapus event ini? Semua data terkait akan hilang permanen.')) return
    setLoading(true)
    await deleteEventAction(event.id)
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 bg-red-50 rounded-lg">
          <ShieldAlert size={20} className="text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Danger Zone</h2>
          <p className="text-sm text-zinc-500 mt-1">Tindakan di sini bersifat permanen dan tidak bisa dibatalkan.</p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-zinc-200">
        {/* Status row */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Ubah Status Event</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 lg:max-w-sm">Ubah status event secara manual. Beberapa status mungkin mempengaruhi tampilan publik.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                <Settings2 size={12} />
              </div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Event['status'])}
                disabled={loading}
                className={cn(SELECT, 'w-full md:w-44 font-semibold pl-8 h-9')}
              >
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Ongoing (Active)</option>
                <option value="finished">Finished</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="filled" onClick={handleSaveStatus} disabled={loading || status === event.status} className="h-9 min-w-[80px]">
              {loading ? '...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Delete row */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Hapus Event Ini</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 lg:max-w-sm">Menghapus event, semua pertandingan, peserta, dan format secara permanen.</p>
          </div>
          <Button
            variant="filled"
            className="bg-red-600 hover:bg-red-700 border-none text-white w-full lg:w-auto h-9 text-sm font-bold flex items-center gap-2"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 size={14} />
            {loading ? 'Menghapus...' : 'Hapus Event'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ----------------------------------------------------------------

export default function SettingsPage() {
  const params  = useParams()
  const eventId = params.eventId as string
  const [tab, setTab]               = useState<'info' | 'timeline' | 'danger'>('info')
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  const { data: event, loading: loadingEvent } = useDirectusFetch<Event>(
    () => directus.request(readItems('events', {
      filter: { slug: { _eq: eventId } },
      fields: [
        'id', 'name', 'slug', 'status', 'location', 'description', 
        'start_date', 'end_date', 'type', 'is_published', 
        'is_registration_open', 'registration_url', 'guidebook_url', 
        'instagram_url', 'website_url', 'url_youtube', 'contact_person', 
        'banner_image', 'card_image'
      ],
      limit: 1,
    })).then(res => (res as Event[])[0]) as Promise<Event>,
    [eventId, refreshKey],
  )

  const { data: phases } = useDirectusFetch<EventPhase[]>(
    () => directus.request(readItems('event_phases', {
      filter: { event_id: { slug: { _eq: eventId } } },
      fields: ['id', 'label', 'status', 'date_start', 'time_start', 'description', 'display_order'],
      sort: ['display_order', 'date_start'],
    })) as Promise<EventPhase[]>,
    [eventId, refreshKey],
  )

  if (loadingEvent || !event) {
    return <div className="p-8 text-zinc-400 font-medium">Loading settings...</div>
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch w-full gap-6 md:gap-0">
      {/* Sidebar */}
      <div className="w-full md:w-[240px] shrink-0 flex flex-col gap-6 md:pr-6 md:border-r md:border-zinc-200">
        <div className="flex flex-col gap-2">
          <TabBtn active={tab === 'info'}     onClick={() => setTab('info')}>Event Info</TabBtn>
          <TabBtn active={tab === 'timeline'} onClick={() => setTab('timeline')}>Event Timeline</TabBtn>
        </div>

        <div className="space-y-3 mt-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Danger Zone</p>
          <TabBtn active={tab === 'danger'} onClick={() => setTab('danger')}>
            <span>Delete & Status</span>
            <span >[ ! ]</span>
          </TabBtn>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 w-full md:pl-6">
        {tab === 'info'     && <InfoTab     event={event}      onRefresh={refresh} />}
        {tab === 'timeline' && <TimelineTab eventId={event.id} phases={phases || []} onRefresh={refresh} />}
        {tab === 'danger'   && <DangerTab   event={event}      onRefresh={refresh} />}
      </div>
    </div>
  )
}