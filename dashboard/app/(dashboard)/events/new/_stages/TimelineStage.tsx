// Tahap 3: Timeline & Jadwal
// UI-nya diambil persis dari settings page buat konsistensi.
// Bedanya: di sini semua data masih lokal (belum ada eventId),
// jadi gak ada server action — semua disimpan ke state dan di-submit bareng di akhir.

import { Fragment, useState } from 'react'
import {
  ChevronUp, ChevronDown, Trash2, Save, Plus,
  Flag, CheckCircle2, Calendar, Clock, AlignLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionCard, FieldGroup, TEXTAREA } from '../_components'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EventForm, Phase } from '../_types'

// --- Konstanta untuk grafik preview (sama persis dari settings) ---
const DOT_SIZE = 14
const LINE_Y   = 60
const GAP      = 28

const SELECT = 'w-full h-9 px-3 rounded-lg border border-zinc-200 text-sm bg-zinc-50/50 outline-none cursor-pointer hover:bg-zinc-100 transition-colors'

function isYellow(v: string) {
  return ['active', 'current', 'done', 'finished', 'over'].includes(String(v ?? '').toLowerCase())
}

function splitLabel(label: string): [string, string | null] {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [label, null]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

interface Props {
  form: EventForm
  cardFile: File | null
  phases: Phase[]
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onChange: (key: keyof EventForm) => (value: string) => void
  onBlur: (key: string) => void
  onAddPhase: () => void
  onRemovePhase: (id: string) => void
  onUpdatePhase: (id: string, patch: Partial<Phase>) => void
}

export function TimelineStage({
  form, cardFile, phases, errors, touched,
  onChange, onBlur,
  onAddPhase, onRemovePhase, onUpdatePhase,
}: Props) {

  // Reorder fase (persis kayak di settings)
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= phases.length) return
    const next = [...phases]
    const a = next[index]
    const b = next[swapIndex]
    if (!a || !b) return
    next[index] = b
    next[swapIndex] = a
    // Update semua urutan sekaligus via parent
    next.forEach((p, i) => onUpdatePhase(p.id, { display_order: i } as any))
    // Kita update satu per satu buat keep in sync
    onUpdatePhase(a.id, { ...b, id: a.id } as any)
    onUpdatePhase(b.id, { ...a, id: b.id } as any)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Baris atas: tanggal event + ringkasan konfirmasi */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        <SectionCard title="Informasi Jadwal">
          <div className="grid grid-cols-2 gap-6">
            <FieldGroup label="Tanggal Mulai*" error={touched.start_date ? errors.start_date : null}>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Calendar size={12} />
                </div>
                <Input
                  type="date"
                  className="pl-8"
                  value={form.start_date}
                  onChange={e => onChange('start_date')(e.target.value)}
                  onBlur={() => onBlur('start_date')}
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Tanggal Selesai*" error={touched.end_date ? errors.end_date : null}>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Calendar size={12} />
                </div>
                <Input
                  type="date"
                  className="pl-8"
                  value={form.end_date}
                  onChange={e => onChange('end_date')(e.target.value)}
                  onBlur={() => onBlur('end_date')}
                />
              </div>
            </FieldGroup>
          </div>
        </SectionCard>

        {/* Preview mini sebelum submit */}
        <SectionCard title="Ringkasan Konfirmasi">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
              {cardFile && (
                <img src={URL.createObjectURL(cardFile)} className="w-full h-full object-cover" alt="poster" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-base font-black text-zinc-900 leading-tight">{form.name || 'Event Baru'}</p>
              <p className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                /event/{form.slug || '...'}
              </p>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* ─── Phase Manager (identik dari settings page) ─────────────────────── */}

      {/* Header dengan tombol Add Phase */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Event Timeline</h2>
          <p className="text-sm text-zinc-500 mt-1">Atur fase/tahapan kegiatan event ini</p>
        </div>
        <Button variant="default" onClick={onAddPhase} className="h-9 gap-2">
          Add Phase <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Grafik preview — persis dari settings */}
      <SectionCard title="Live Preview Graph">
        <div className="relative w-full h-[180px] px-8 md:px-12 pt-8">
          {phases.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-zinc-400 italic">Belum ada fase.</span>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Garis penghubung antar titik */}
              {phases.map((phase, i) => {
                if (i === phases.length - 1) return null
                const next = phases[i + 1]
                if (!next) return null
                const x1  = (i / (phases.length - 1)) * 100
                const x2  = ((i + 1) / (phases.length - 1)) * 100
                const l   = isYellow(phase.status || '')
                const r   = isYellow(next.status || '')
                const bg  = l && r ? '#FFC936' : !l && !r ? '#D1D5DB'
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

              {/* Titik dan label di atas/bawah */}
              {phases.map((phase, i) => {
                const x          = phases.length === 1 ? 50 : (i / (phases.length - 1)) * 100
                const isTop      = i % 2 === 0
                const done       = isYellow(phase.status || '')
                const [l1, l2]   = splitLabel(phase.label)
                const translateX = i === 0 ? '0' : i === phases.length - 1 ? '-100%' : '-50%'
                const textAlign  = i === 0 ? 'left' : i === phases.length - 1 ? 'right' : 'center'

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

      {/* Daftar fase yang bisa di-edit — identik dari settings */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-900">Timeline Phase Settings</h3>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Fase ini akan disimpan saat event dibuat
          </span>
        </div>

        <div className="divide-y divide-zinc-100">
          {phases.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-10">Belum ada fase. Silakan tambahkan fase baru.</p>
          )}

          {phases.map((phase, i) => (
            <div key={phase.id} className="p-6 flex flex-col gap-4 hover:bg-zinc-50/30 transition-colors">
              <div className="flex items-end gap-4">

                {/* Tombol atur urutan naik/turun */}
                <div className="flex flex-col gap-1 pb-1">
                  <button
                    onClick={() => handleMove(i, 'up')}
                    disabled={i === 0}
                    className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMove(i, 'down')}
                    disabled={i === phases.length - 1}
                    className="p-1 hover:bg-zinc-200 rounded transition-colors disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Nama fase */}
                <div className="flex-1">
                  <FieldGroup label="Nama Fase*">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Flag size={12} />
                      </div>
                      <Input
                        value={phase.label}
                        onChange={e => onUpdatePhase(phase.id, { label: e.target.value })}
                        className="pl-8 h-7"
                        placeholder="Contoh: Pembukaan / Final"
                      />
                    </div>
                  </FieldGroup>
                </div>

                {/* Status */}
                <div className="w-40">
                  <FieldGroup label="Status">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <CheckCircle2 size={12} />
                      </div>
                      <Select
                        value={phase.status || 'upcoming'}
                        onValueChange={v => onUpdatePhase(phase.id, { status: v as any })}
                      >
                        <SelectTrigger className="pl-8 h-7 bg-zinc-50/50 border-zinc-200">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldGroup>
                </div>

                {/* Tanggal mulai */}
                <div className="w-32">
                  <FieldGroup label="Tanggal Mulai*">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Calendar size={12} />
                      </div>
                      <Input
                        type="date"
                        value={phase.date_start}
                        onChange={e => onUpdatePhase(phase.id, { date_start: e.target.value })}
                        className="pl-8 h-7"
                      />
                    </div>
                  </FieldGroup>
                </div>

                {/* Jam */}
                <div className="w-24">
                  <FieldGroup label="Waktu">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                        <Clock size={12} />
                      </div>
                      <Input
                        type="time"
                        value={phase.time_start || '09:00'}
                        onChange={e => onUpdatePhase(phase.id, { time_start: e.target.value })}
                        className="pl-8 h-7"
                      />
                    </div>
                  </FieldGroup>
                </div>

                {/* Hapus */}
                <div className="pb-0.5">
                  <Button
                    variant="noBorder"
                    className="h-7 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 p-0 rounded-lg"
                    onClick={() => onRemovePhase(phase.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

              </div>

              {/* Deskripsi opsional */}
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
                      onChange={e => onUpdatePhase(phase.id, { description: e.target.value } as any)}
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
