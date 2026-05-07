// app/(dashboard)/events/[eventId]/settings/page.tsx
'use client'

import { useState, useEffect, Fragment, useRef } from 'react'
import { useParams } from 'next/navigation'
import { readItem, readItems } from '@directus/sdk'
import { ExternalLink, ChevronUp, ChevronDown, Trash2, Save, Check, Clock, Plus } from 'lucide-react'

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
  deleteEventPhaseAction
} from './_actions'

// --- 1. INFO TAB -----------------------------------------------

function InfoTab({ event, onRefresh }: { event: Event, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: event.name || '',
    location: event.location || '',
    description: event.description || '',
    start_date: event.start_date || '',
    end_date: event.end_date || '',
  })
  
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [cardFile, setCardFile] = useState<File | null>(null)

  // Refs untuk memicu file explorer
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const cardInputRef = useRef<HTMLInputElement>(null)

  // State untuk visual saat dragging
  const [dragActive, setDragActive] = useState<{banner: boolean, card: boolean}>({
    banner: false,
    card: false
  })

  useEffect(() => {
    return () => {
      if (bannerFile) URL.revokeObjectURL(URL.createObjectURL(bannerFile))
      if (cardFile) URL.revokeObjectURL(URL.createObjectURL(cardFile))
    }
  }, [bannerFile, cardFile])

  // --- Handlers untuk Drag and Drop ---
  const handleDrag = (e: React.DragEvent, type: 'banner' | 'card') => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }))
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleDrop = (e: React.DragEvent, type: 'banner' | 'card') => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(prev => ({ ...prev, [type]: false }))
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (type === 'banner') setBannerFile(file)
      else setCardFile(file)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const data = new FormData()
    data.append('eventId', event.id)
    data.append('name', formData.name)
    data.append('location', formData.location)
    data.append('description', formData.description)
    data.append('start_date', formData.start_date)
    data.append('end_date', formData.end_date)
    if (bannerFile) data.append('banner_image', bannerFile)
    if (cardFile) data.append('card_image', cardFile)
    
    const res = await updateEventInfoAction(data)
    if (res.success) onRefresh()
    setLoading(false)
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">Event Info Settings</h2>
          <p className="text-sm text-zinc-500 mt-1">Kelola identitas dan aset visual event Anda</p>
        </div>
        <Button variant="filled" onClick={handleSave} disabled={loading} className="h-9 gap-2">
          <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Info'}
        </Button>
      </div>

      <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Nama Event*</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="bg-zinc-50/50 border-zinc-200 focus:bg-white text-sm" 
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Deskripsi*</Label>
              <textarea 
                className="w-full h-44 p-3 rounded-lg text-sm bg-zinc-50/50 border border-zinc-200 focus:ring-1 focus:ring-zinc-400 focus:bg-white outline-none resize-none transition-all"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Tanggal Mulai*</Label>
                <Input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Tanggal Selesai*</Label>
                <Input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Lokasi / Venue*</Label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>

            {/* UPLOAD BANNER */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Event Banner (Desktop)</Label>
              
              <div 
                onClick={() => bannerInputRef.current?.click()}
                onDragEnter={(e) => handleDrag(e, 'banner')}
                onDragOver={(e) => handleDrag(e, 'banner')}
                onDragLeave={(e) => handleDrag(e, 'banner')}
                onDrop={(e) => handleDrop(e, 'banner')}
                className={cn(
                  "relative group h-36 bg-zinc-50 rounded-xl overflow-hidden border-2 border-dashed transition-all flex items-center justify-center cursor-pointer",
                  dragActive.banner ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100"
                )}
              >
                { (bannerFile || event.banner_image) ? (
                  <img 
                    src={bannerFile ? URL.createObjectURL(bannerFile) : getAssetUrl(event.banner_image)!} 
                    alt="Banner Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-[11px] font-bold text-zinc-400">CLICK OR DRAG TO UPLOAD BANNER</p>
                  </div>
                )}
                
                {/* Real hidden input */}
                <input 
                  type="file" 
                  ref={bannerInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={e => setBannerFile(e.target.files?.[0] || null)}
                />

                {(bannerFile || event.banner_image) && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-[10px] font-bold tracking-widest">CHANGE IMAGE</p>
                  </div>
                )}
              </div>
            </div>

            {/* UPLOAD CARD */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Event Card (Poster)</Label>
              <div className="flex items-start gap-4">
                <div 
                  onClick={() => cardInputRef.current?.click()}
                  onDragEnter={(e) => handleDrag(e, 'card')}
                  onDragOver={(e) => handleDrag(e, 'card')}
                  onDragLeave={(e) => handleDrag(e, 'card')}
                  onDrop={(e) => handleDrop(e, 'card')}
                  className={cn(
                    "relative group w-28 h-40 bg-zinc-50 rounded-lg overflow-hidden border-2 border-dashed transition-all flex items-center justify-center cursor-pointer shrink-0",
                    dragActive.card ? "border-amber-500 bg-amber-50" : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100"
                  )}
                >
                  { (cardFile || event.card_image) ? (
                    <img 
                      src={cardFile ? URL.createObjectURL(cardFile) : getAssetUrl(event.card_image)!} 
                      alt="Card Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-400 text-center px-2">UPLOAD POSTER</span>
                  )}
                  <input 
                    type="file" 
                    ref={cardInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={e => setCardFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-zinc-800">Poster Event</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Tarik file ke kotak poster atau klik untuk memilih file.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. TIMELINE TAB -------------------------------------------

const DOT_SIZE = 14;
const LINE_Y   = 60;
const GAP      = 28;

function isYellow(v: string) { 
  return["active","current","done","finished","over"].includes(String(v ?? "").toLowerCase()); 
}

function splitLabel(label: string):[string, string | null] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [label, null];
  const mid = Math.ceil(words.length / 2);
  return[words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function TimelineTab({ eventId, phases, onRefresh }: { eventId: string, phases: EventPhase[], onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [localPhases, setLocalPhases] = useState(phases);

  useEffect(() => { setLocalPhases(phases) }, [phases]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localPhases.length - 1) return;
    const newPhases = [...localPhases];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp1 = newPhases[index];
    const temp2 = newPhases[swapIndex];
    if (temp1 && temp2) {
      newPhases[index] = temp2;
      newPhases[swapIndex] = temp1;
      setLocalPhases(newPhases);
    }
  };

  const handleSaveTimeline = async () => {
    setLoading(true);
    await saveTimelinePhasesAction(eventId, localPhases);
    onRefresh();
    setLoading(false);
  };

  const handleAddPhase = async () => {
    setLoading(true);
    await createEventPhaseAction(eventId, {
      label: 'New Phase',
      description: '', // Inisialisasi kosong
      date_start: new Date().toISOString().split('T')[0],
      time_start: '09:00',
      display_order: localPhases.length
    });
    onRefresh();
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">Event Timeline Display</h2>
          <p className="text-sm text-zinc-500 mt-1">Preview grafis dan pengaturan detail fase publik</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="default" onClick={handleAddPhase} disabled={loading} className="h-9">
            Add Phase<Plus className=" h-4 w-4" />
          </Button>
          <Button variant="filled" onClick={handleSaveTimeline} disabled={loading} className="h-9 gap-2">
            <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Timeline'}
          </Button>
        </div>
      </div>

      {/* ════ GRAPH PREVIEW ════ */}
      <div className="border border-zinc-200 rounded-[8px] bg-white p-6 shadow-sm overflow-hidden">
        <h3 className="font-bold text-[14px] text-zinc-900 mb-6">Live Preview Graph</h3>
        <div className="relative w-full h-[140px] px-8 md:px-12"> 
          {localPhases.length === 0 ? (
            <div className="flex h-full items-center justify-center">
               <span className="text-sm text-zinc-400 italic">Belum ada fase.</span>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {localPhases.map((phase, i) => {
                if (i === localPhases.length - 1) return null;
                const nextPhase = localPhases[i + 1];
                if (!nextPhase) return null;
                const x1 = (i / (localPhases.length - 1)) * 100;
                const x2 = ((i + 1) / (localPhases.length - 1)) * 100;
                const leftDone = isYellow(phase.status);
                const rightDone = isYellow(nextPhase.status);
                const bg = leftDone && rightDone ? '#FFC936' : !leftDone && !rightDone ? '#D1D5DB' : leftDone ? `linear-gradient(to right, #FFC936, #D1D5DB)` : `linear-gradient(to right, #D1D5DB, #FFC936)`;
                return (
                  <div key={`line-${phase.id}`} className="absolute z-[1] rounded-full" style={{ left: `${x1}%`, top: LINE_Y, width: `${x2 - x1}%`, height: 3, transform: "translateY(-50%)", background: bg }} />
                );
              })}

              {localPhases.map((phase, i) => {
                const x = localPhases.length === 1 ? 50 : (i / (localPhases.length - 1)) * 100;
                const isTop = i % 2 === 0;
                const done = isYellow(phase.status);
                const [line1, line2] = splitLabel(phase.label);
                let translateX = "-50%"; let textAlign = "center";
                if (i === 0) { translateX = "0"; textAlign = "left"; } 
                else if (i === localPhases.length - 1) { translateX = "-100%"; textAlign = "right"; }

                return (
                  <Fragment key={phase.id}>
                    <div className="absolute w-[120px] pointer-events-none" style={{ left: `${x}%`, top: isTop ? LINE_Y - GAP : LINE_Y + GAP, transform: `translate(${translateX}, ${isTop ? "-100%" : "0"})`, textAlign: textAlign as any }}>
                      <span className={`text-[12px] leading-[1.3] block ${done ? 'font-extrabold text-zinc-900' : 'font-semibold text-zinc-500'}`}>
                        {line2 ? <>{line1}<br />{line2}</> : line1}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 mt-1 block">{phase.date_start}</span>
                    </div>
                    <div className="absolute z-[3] rounded-full" style={{ left: `${x}%`, top: LINE_Y, transform: "translate(-50%, -50%)", width: DOT_SIZE, height: DOT_SIZE, background: done ? '#FFC936' : '#D1D5DB', boxShadow: done ? "0 0 12px 3px rgba(255,201,54,0.45)" : "0 0 8px rgba(209,213,219,0.4)" }} />
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════ EDITABLE LIST ════ */}
      <div className="border border-zinc-200 rounded-[8px] overflow-hidden bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <h3 className="font-bold text-[14px] text-zinc-900">Timeline Phase Settings</h3>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Press "Save Timeline" to push all changes
          </span>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {localPhases.map((phase, i) => (
            <div key={phase.id} className="p-5 flex flex-col gap-4 hover:bg-zinc-50/30 transition-colors">
              
              {/* Row Atas: Controls, Name, Date, Time, Delete */}
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1 pb-1">
                  <button onClick={() => handleMove(i, 'up')} disabled={i === 0 || loading} className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => handleMove(i, 'down')} disabled={i === localPhases.length - 1 || loading} className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Phase Name*</Label>
                  <Input 
                    value={phase.label} 
                    onChange={(e) => setLocalPhases(localPhases.map(p => p.id === phase.id ? {...p, label: e.target.value} : p))}
                    className="bg-white border-zinc-200 text-sm h-9" 
                  />
                </div>

                <div className="w-40 space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Start Date*</Label>
                  <Input 
                    type="date"
                    value={phase.date_start} 
                    onChange={(e) => setLocalPhases(localPhases.map(p => p.id === phase.id ? {...p, date_start: e.target.value} : p))}
                    className="bg-white border-zinc-200 text-sm h-9" 
                  />
                </div>

                <div className="w-32 space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Time</Label>
                  <Input 
                    type="time"
                    value={phase.time_start || '09:00'} 
                    onChange={(e) => setLocalPhases(localPhases.map(p => p.id === phase.id ? {...p, time_start: e.target.value} : p))}
                    className="bg-white border-zinc-200 text-sm h-9 px-2" 
                  />
                </div>

                <div className="pb-0.5">
                  <Button 
                    variant="noBorder" 
                    className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 p-0 rounded-md"
                    onClick={async () => {
                      if(!confirm('Hapus fase ini?')) return;
                      setLoading(true);
                      await deleteEventPhaseAction(eventId, phase.id);
                      onRefresh();
                      setLoading(false);
                    }}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Row Bawah: Description */}
              <div className="pl-11 space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Description / Notes</Label>
                <textarea 
                  placeholder="Opsional: detail mengenai fase ini (lokasi, syarat, dsb)..."
                  className="w-full h-20 p-3 text-[13px] bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white resize-none transition-all"
                  value={phase.description || ''}
                  onChange={(e) => setLocalPhases(localPhases.map(p => p.id === phase.id ? {...p, description: e.target.value} : p))}
                />
              </div>

            </div>
          ))}
          {localPhases.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-10">Belum ada fase. Silakan tambahkan fase baru.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// --- 3. DANGER TAB ---------------------------------------------

function DangerTab({ event, onRefresh }: { event: Event, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  // FIX TYPE ERROR: Casting tipe saat deklarasi state
  const [status, setStatus] = useState<Event['status']>(event.status)

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">Danger Zone</h2>
          <p className="text-sm text-zinc-500 mt-1">Tindakan di sini bersifat permanen dan tidak bisa dibatalkan.</p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-[8px] overflow-hidden bg-white">
        
        {/* ROW 1: Ubah Status */}
        <div className="p-5 border-b border-zinc-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[14px] text-zinc-900">Ubah Status Event</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 lg:max-w-sm">Ubah status event secara manual. Beberapa status mungkin mempengaruhi tampilan publik.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* FIX TYPE ERROR: Casting target value menjadi Event['status'] saat onChange */}
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as Event['status'])}
              disabled={loading}
              className="h-9 px-3 rounded-[6px] border border-zinc-200 text-[13px] font-semibold bg-zinc-50 outline-none w-full md:w-44 cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Ongoing (Active)</option>
              <option value="finished">Finished</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <Button 
              variant="filled" 
              onClick={handleSaveStatus} 
              disabled={loading || status === event.status} 
              className="h-9"
            >
              Save
            </Button>
          </div>
        </div>

        {/* ROW 2: Hapus Event */}
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[14px] text-zinc-900">Hapus Event Ini</h3>
            <p className="text-[13px] text-zinc-500 mt-0.5 lg:max-w-sm">Menghapus event, semua pertandingan, peserta, dan format secara permanen.</p>
          </div>
          <Button 
            variant="filled" 
            className="bg-red-600 hover:bg-red-700 border-none text-white w-full lg:w-auto h-9 font-semibold text-[13px]" 
            onClick={handleDelete} 
            disabled={loading}
          >
            {loading ? 'Menghapus...' : 'Hapus Event'}
          </Button>
        </div>

      </div>
    </div>
  )
}


// --- MAIN PAGE -------------------------------------------------

// --- MAIN PAGE (Lanjutan dari bagian yang terpotong) ---

export default function SettingsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'danger'>('info')
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch Data Event
  const { data: event, loading: loadingEvent } = useDirectusFetch<Event>(
    () => directus.request(readItem('events', eventId)) as Promise<Event>,
    [eventId, refreshKey]
  )

  // Fetch Data Phases (Timeline)
  const { data: phases, loading: loadingPhases } = useDirectusFetch<EventPhase[]>(
    () => directus.request(readItems('event_phases', { 
      filter: { event_id: { _eq: eventId } }, 
      sort: ['display_order', 'date_start'] 
    })) as Promise<EventPhase[]>,
    [eventId, refreshKey]
  )

  if (loadingEvent || !event) {
    return <div className="p-8 text-zinc-400 font-medium">Loading settings...</div>
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch w-full gap-6 md:gap-0">
      
      {/* Sidebar Tabs dengan Divider Vertikal (md:border-r) */}
      <div className="w-full md:w-[240px] shrink-0 flex flex-col gap-6 md:pr-6 md:border-r md:border-zinc-200">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex w-full items-center justify-between rounded-[8px] border-[1px] px-4 py-2.5 text-sm font-bold transition-all outline-none",
              activeTab === 'info' 
                ? "border-transparent bg-zinc-900 text-white shadow-md" 
                : "border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100"
            )}
          >
            Event Info
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              "flex w-full items-center justify-between rounded-[8px] border-[1px] px-4 py-2.5 text-sm font-bold transition-all outline-none",
              activeTab === 'timeline' 
                ? "border-transparent bg-zinc-900 text-white shadow-md" 
                : "border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100"
            )}
          >
            Event Timeline
          </button>
        </div>

        <div className="space-y-3 mt-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
            Danger Zone
          </p>
          <button
            onClick={() => setActiveTab('danger')}
            className={cn(
              "flex w-full items-center justify-between rounded-[8px] border-[1px] px-4 py-2.5 text-sm font-bold transition-all outline-none",
              activeTab === 'danger' 
                ? "border-transparent bg-zinc-900 text-white shadow-md" 
                : "border-zinc-900 bg-transparent text-zinc-900 hover:bg-zinc-100"
            )}
          >
            <span>Delete & Status</span>
            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-black">
              [ ! ]
            </span>
          </button>
        </div>
      </div>

      {/* Main Content dengan Padding Kiri (md:pl-6) */}
      <div className="flex-1 min-w-0 flex flex-col w-full md:pl-6">
        {activeTab === 'info' && (
          <InfoTab event={event} onRefresh={() => setRefreshKey(k => k + 1)} />
        )}
        
        {activeTab === 'timeline' && (
          <TimelineTab 
            eventId={eventId} 
            phases={phases || []} 
            onRefresh={() => setRefreshKey(k => k + 1)} 
          />
        )}
        
        {activeTab === 'danger' && (
          <DangerTab 
            event={event} 
            onRefresh={() => setRefreshKey(k => k + 1)} 
          />
        )}
      </div>
    </div>
  )
}