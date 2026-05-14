// Komponen-komponen kecil yang dipake bersama di seluruh wizard
// Mirip dengan primitif di settings page untuk konsistensi visual

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// --- Style constants (sama persis kayak di settings page) ---

export const TEXTAREA = [
  'w-full p-3 rounded-lg text-sm',
  'bg-zinc-50/50 border border-zinc-200',
  'focus:ring-1 focus:ring-zinc-400 focus:bg-white',
  'outline-none resize-none transition-all',
  'placeholder:italic placeholder:text-zinc-400',
].join(' ')

export const LABEL_CLS = 'text-[11px] font-bold text-zinc-600 uppercase tracking-wider'

const DROPZONE_BASE = 'relative group bg-zinc-50 rounded-xl overflow-hidden border-2 border-dashed transition-all flex items-center justify-center cursor-pointer'
const DROPZONE_IDLE = 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100'
const DROPZONE_DRAG = 'border-amber-500 bg-amber-50'

// --- SectionCard ---
// Wrapper panel berisi judul dan konten form

export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border border-zinc-200 rounded-xl bg-white shadow-sm overflow-hidden', className)}>
      {title && (
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/30">
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

// --- FieldGroup ---
// Label + deskripsi + input + pesan error, dipakai di semua field form

export function FieldGroup({
  label,
  description,
  children,
  error,
}: {
  label: string
  description?: string
  children: React.ReactNode
  error?: string | null
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <Label className={LABEL_CLS}>{label}</Label>
        {description && <p className="text-[10px] text-zinc-500 font-medium">{description}</p>}
      </div>
      {children}
      {error && (
        <p className="text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  )
}

// --- ImageUpload ---
// Dropzone untuk upload gambar (banner / poster), support drag-and-drop

export function ImageUpload({
  label,
  file,
  isDragging,
  inputRef,
  onFile,
  onDrag,
  onDrop,
  className,
  emptyLabel,
  error,
}: {
  label: string
  file: File | null
  isDragging: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onFile: (f: File | null) => void
  onDrag: (e: React.DragEvent, active: boolean) => void
  onDrop: (e: React.DragEvent) => void
  className?: string
  emptyLabel: string
  error?: string | null
}) {
  // Buat URL preview sementara dari file yang dipilih
  const preview = file ? URL.createObjectURL(file) : null

  return (
    <div className="space-y-2">
      <Label className={LABEL_CLS}>{label}</Label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={e => onDrag(e, true)}
        onDragOver={e => onDrag(e, true)}
        onDragLeave={e => onDrag(e, false)}
        onDrop={onDrop}
        className={cn(
          DROPZONE_BASE,
          isDragging ? DROPZONE_DRAG : DROPZONE_IDLE,
          className,
          error && 'border-red-300 bg-red-50',
        )}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <p className="text-[11px] font-bold text-zinc-500 text-center px-4">{emptyLabel}</p>
        )}

        {/* Input file asli — disembunyiin, trigger via click di dropzone */}
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*"
          onChange={e => onFile(e.target.files?.[0] ?? null)}
        />

        {/* Overlay hover saat ada gambar */}
        {preview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-[10px] font-bold tracking-widest uppercase">Ganti Gambar</p>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
    </div>
  )
}

// --- StageBtn ---
// Tombol navigasi sidebar untuk setiap tahap wizard

export function StageBtn({
  active,
  isDone,
  icon: Icon,
  title,
  subtext,
  onClick,
}: {
  active: boolean
  isDone: boolean
  icon: LucideIcon
  title: string
  subtext: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-4 rounded-xl border p-4 transition-all outline-none text-left',
        'border-zinc-900',
        active
          ? 'bg-zinc-900 text-white shadow-xl scale-[1.02] z-10'
          : isDone
            ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            : 'bg-transparent text-zinc-500 hover:bg-zinc-50',
      )}
    >
      {/* Icon lingkaran: ceklis kalo udah selesai, ikon tahap kalo belum */}
      <div className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full transition-colors shrink-0',
        active
          ? 'bg-white text-zinc-900'
          : isDone
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 border border-zinc-200',
      )}>
        {isDone && !active ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
      </div>

      <div className="space-y-0.5 overflow-hidden">
        <p className={cn('text-xs font-black tracking-tight truncate', active ? 'text-white' : 'text-zinc-900')}>
          {title}
        </p>
        <p className={cn('text-[10px] font-bold opacity-70 leading-tight', active ? 'text-zinc-300' : 'text-zinc-500')}>
          {subtext}
        </p>
      </div>
    </button>
  )
}
